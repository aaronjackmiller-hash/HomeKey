'use strict';

const { importYad2Listings } = require('./yad2ImportService');
const Property = require('../models/Property');

const DEFAULT_SYNC_MINUTES = 15;
const MIN_SYNC_MINUTES = 5;
const MAX_SYNC_MINUTES = 180;
const DEFAULT_SOURCE_TAG = 'yad2-live-sync';
const DEFAULT_MIRROR_MODE = true;
const DEFAULT_SCRAPE_MAX_ITEMS = 120;
const MAX_SCRAPE_MAX_ITEMS = 500;
const DEFAULT_SCRAPE_FETCH_ATTEMPTS = 3;
const YAD2_RENT_URL = 'https://www.yad2.co.il/realestate/rent';
const YAD2_FORSALE_URL = 'https://www.yad2.co.il/realestate/forsale';
const YAD2_HOMEPAGE_URL = 'https://www.yad2.co.il/';
const SCRAPE_USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
];
const DEFAULT_SEGMENTED_SCRAPE_ENABLED = true;
const DEFAULT_SEGMENTS = [
    { key: 'center-and-sharon', label: 'Center & Sharon', path: 'center-and-sharon' },
    { key: 'tel-aviv-area', label: 'Tel Aviv Area', path: 'tel-aviv-area' },
    { key: 'jerusalem-area', label: 'Jerusalem Area', path: 'jerusalem-area' },
    { key: 'south', label: 'South', path: 'south' },
    { key: 'coastal-north', label: 'Coastal North', path: 'coastal-north' },
    { key: 'north-and-valleys', label: 'North & Valleys', path: 'north-and-valleys' },
];

const parseSyncMinutes = () => {
    const raw = Number(process.env.YAD2_SYNC_INTERVAL_MINUTES || DEFAULT_SYNC_MINUTES);
    if (!Number.isFinite(raw)) return DEFAULT_SYNC_MINUTES;
    return Math.max(MIN_SYNC_MINUTES, Math.min(MAX_SYNC_MINUTES, Math.floor(raw)));
};

const parseBooleanEnv = (value, defaultValue = false) => {
    if (typeof value !== 'string') return defaultValue;
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    return defaultValue;
};

const parseScrapeMaxItems = () => {
    const raw = Number(process.env.YAD2_SCRAPE_MAX_ITEMS || DEFAULT_SCRAPE_MAX_ITEMS);
    if (!Number.isFinite(raw)) return DEFAULT_SCRAPE_MAX_ITEMS;
    return Math.max(1, Math.min(MAX_SCRAPE_MAX_ITEMS, Math.floor(raw)));
};

const parseSegmentedScrapeEnabled = () =>
    parseBooleanEnv(process.env.YAD2_SEGMENTED_SCRAPE_ENABLED, DEFAULT_SEGMENTED_SCRAPE_ENABLED);

const parseSegmentList = () => {
    const configured = typeof process.env.YAD2_SCRAPE_SEGMENTS === 'string'
        ? process.env.YAD2_SCRAPE_SEGMENTS
        : '';
    if (!configured.trim()) return DEFAULT_SEGMENTS;
    const segments = configured
        .split(',')
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean)
        .map((part) => ({
            key: part,
            label: part.replace(/-/g, ' '),
            path: part,
        }));
    return segments.length > 0 ? segments : DEFAULT_SEGMENTS;
};

const normalizeSpaces = (value) =>
    String(value || '')
        .replace(/\s+/g, ' ')
        .trim();

const decodeHtmlEntities = (value) =>
    String(value || '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, '\'')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

const stripTags = (value) => String(value || '').replace(/<[^>]*>/g, ' ');

const buildScrapeHeaders = (userAgent) => ({
    'User-Agent': userAgent,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
    Referer: 'https://www.yad2.co.il/',
    Pragma: 'no-cache',
    'Cache-Control': 'no-cache',
});

const looksLikeBotChallenge = (html) => {
    const normalized = String(html || '').toLowerCase();
    if (!normalized) return true;
    return [
        'captcha',
        'verify you are human',
        'access denied',
        'service unavailable',
        'cloudflare',
        'akamai',
        'incident id',
    ].some((marker) => normalized.includes(marker));
};

const parsePathToRegion = (pathValue) => {
    const parts = String(pathValue || '').split('/').filter(Boolean);
    if (parts.length < 4) return 'Israel';
    const regionSlug = parts[parts.length - 2] || '';
    const regionLabel = regionSlug
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    return regionLabel || 'Israel';
};

const parseListingIdFromPath = (pathValue) => {
    const parts = String(pathValue || '').split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
};

const parseNisPrice = (text) => {
    const match = normalizeSpaces(text).match(/([\d,]{3,})\s*₪/);
    if (!match) return null;
    const parsed = Number(String(match[1]).replace(/,/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parseRoomCount = (text) => {
    const normalized = normalizeSpaces(text);
    const englishMatch = normalized.match(/(\d+(?:\.\d+)?)\s*rooms?/i);
    if (englishMatch) {
        const parsed = Number(englishMatch[1]);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    const hebrewMatch = normalized.match(/(\d+(?:\.\d+)?)\s*חדרים/);
    if (!hebrewMatch) return null;
    const parsed = Number(hebrewMatch[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parseAreaSqm = (text) => {
    const normalized = normalizeSpaces(text);
    const englishMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:sqm|m2|square meters?)/i);
    if (englishMatch) {
        const parsed = Number(englishMatch[1]);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    const hebrewMatch = normalized.match(/(\d+(?:\.\d+)?)\s*מ["״']?ר/);
    if (!hebrewMatch) return null;
    const parsed = Number(hebrewMatch[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizeHref = (value) => {
    if (!value) return null;
    const decoded = decodeHtmlEntities(value).replace(/&amp;.*$/, '');
    if (decoded.startsWith('http://') || decoded.startsWith('https://')) return decoded;
    if (decoded.startsWith('/')) return `https://www.yad2.co.il${decoded}`;
    return null;
};

const buildFallbackRow = ({ href, anchorText, dealType }) => {
    try {
        const urlObj = new URL(href);
        const id = parseListingIdFromPath(urlObj.pathname);
        if (!id) return null;
        const region = parsePathToRegion(urlObj.pathname);
        const normalizedText = normalizeSpaces(decodeHtmlEntities(stripTags(anchorText)));
        const price = parseNisPrice(normalizedText) || (dealType === 'rental' ? 5000 : 2500000);
        const rooms = parseRoomCount(normalizedText) || (dealType === 'rental' ? 3 : 4);
        const area = parseAreaSqm(normalizedText) || (dealType === 'rental' ? 80 : 110);
        const bathrooms = Math.max(1, Math.round(rooms / 2));
        const defaultTitle = `${rooms}-room ${dealType} listing in ${region}`;
        const title = normalizedText.length > 12 ? normalizedText.slice(0, 120) : defaultTitle;
        return {
            id,
            title,
            description: `Temporary Yad2 scrape fallback listing (${dealType}).`,
            dealType,
            sourceType: 'yad2-scrape',
            price,
            rooms,
            bathrooms,
            area,
            city: region,
            country: 'Israel',
            status: 'active',
            url: href,
        };
    } catch (err) {
        return null;
    }
};

const extractRowsFromYad2Html = ({ html, dealType, maxItems }) => {
    const rows = [];
    const seenIds = new Set();
    const rawHtml = String(html || '');
    const challengeDetected = looksLikeBotChallenge(rawHtml);
    const htmlVariants = rawHtml.includes('\\/realestate\\/item/')
        ? [rawHtml, rawHtml.replace(/\\\//g, '/')]
        : [rawHtml];
    const addRowFromHref = (hrefCandidate, anchorText = '') => {
        if (rows.length >= maxItems) return;
        const href = normalizeHref(String(hrefCandidate || '').replace(/\\\//g, '/'));
        if (!href) return;
        const row = buildFallbackRow({ href, anchorText, dealType });
        if (!row || seenIds.has(row.id)) return;
        seenIds.add(row.id);
        rows.push(row);
    };

    for (const variant of htmlVariants) {
        const anchorRegexes = [
            /<a[^>]+href\s*=\s*"([^"]*\/realestate\/item\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
            /<a[^>]+href\s*=\s*'([^']*\/realestate\/item\/[^']+)'[^>]*>([\s\S]*?)<\/a>/gi,
            /<a[^>]+href\s*=\s*([^"'\s>]+\/realestate\/item\/[^"'\s>]+)[^>]*>([\s\S]*?)<\/a>/gi,
        ];
        for (const anchorRegex of anchorRegexes) {
            let match = anchorRegex.exec(variant);
            while (match && rows.length < maxItems) {
                addRowFromHref(match[1], match[2]);
                match = anchorRegex.exec(variant);
            }
            if (rows.length >= maxItems) break;
        }
        if (rows.length >= maxItems) break;
    }

    if (rows.length > 0) return { rows, challengeDetected };

    // Fallback extractors in case Yad2 embeds links inside script blobs.
    for (const variant of htmlVariants) {
        const hrefRegexes = [
            /https?:\/\/www\.yad2\.co\.il\/realestate\/item\/[a-z0-9-]+\/[a-z0-9]+(?:\?[^"'\s<]*)?/gi,
            /\/realestate\/item\/[a-z0-9-]+\/[a-z0-9]+(?:\?[^"'\s<]*)?/gi,
            /https?:\\\/\\\/www\.yad2\.co\.il\\\/realestate\\\/item\\\/[a-z0-9-]+\\\/[a-z0-9]+(?:\\\?[^"'\s<]*)?/gi,
            /\\\/realestate\\\/item\\\/[a-z0-9-]+\\\/[a-z0-9]+(?:\\\?[^"'\s<]*)?/gi,
        ];
        for (const hrefRegex of hrefRegexes) {
            let hrefMatch = hrefRegex.exec(variant);
            while (hrefMatch && rows.length < maxItems) {
                addRowFromHref(hrefMatch[0]);
                hrefMatch = hrefRegex.exec(variant);
            }
            if (rows.length >= maxItems) break;
        }
        if (rows.length >= maxItems) break;
    }

    return { rows, challengeDetected };
};

const scrapeYad2Listings = async ({ segment = null } = {}) => {
    const scrapeMaxItems = parseScrapeMaxItems();
    const segmentSuffix = segment && segment.path ? `/${segment.path}` : '';
    const pages = [
        {
            url: `${YAD2_RENT_URL}${segmentSuffix}`,
            dealType: 'rental',
            segmentKey: segment ? segment.key : 'all',
        },
        {
            url: `${YAD2_FORSALE_URL}${segmentSuffix}`,
            dealType: 'sale',
            segmentKey: segment ? segment.key : 'all',
        },
    ];
    const perPageLimit = Math.max(1, Math.floor(scrapeMaxItems / pages.length));
    const useSegmentPath = Boolean(segment && segment.path);
    const allRows = [];
    const seenIds = new Set();
    const diagnostics = [];

    const fetchAndExtractRows = async ({ url, dealType }) => {
        for (let attempt = 1; attempt <= DEFAULT_SCRAPE_FETCH_ATTEMPTS; attempt += 1) {
            const userAgent = SCRAPE_USER_AGENTS[(attempt - 1) % SCRAPE_USER_AGENTS.length];
            try {
                const response = await fetch(url, {
                    headers: buildScrapeHeaders(userAgent),
                    signal: AbortSignal.timeout(30000),
                });
                if (!response.ok) {
                    diagnostics.push(`${dealType}:${response.status} from ${url}`);
                    continue;
                }
                const html = await response.text();
                const extraction = extractRowsFromYad2Html({
                    html,
                    dealType,
                    maxItems: perPageLimit,
                });
                if (extraction.rows.length > 0) {
                    return extraction.rows;
                }
                diagnostics.push(
                    extraction.challengeDetected
                        ? `${dealType}: challenge-like page on attempt ${attempt} (${url})`
                        : `${dealType}: zero links extracted on attempt ${attempt} (${url})`
                );
            } catch (err) {
                diagnostics.push(`${dealType}: ${err.message}`);
            }
        }
        return [];
    };

    for (const page of pages) {
        let extracted = await fetchAndExtractRows({
            url: page.url,
            dealType: page.dealType,
        });
        if (extracted.length === 0 && useSegmentPath) {
            // Region subpaths can intermittently return thin/empty HTML depending on antibot behavior.
            // Fall back to base rent/forsale pages for resilience instead of skipping the whole segment.
            const fallbackBaseUrl = page.dealType === 'rental' ? YAD2_RENT_URL : YAD2_FORSALE_URL;
            extracted = await fetchAndExtractRows({
                url: fallbackBaseUrl,
                dealType: page.dealType,
            });
        }
        if (extracted.length === 0) {
            // Some network paths only expose real-estate cards on the Yad2 lobby page.
            extracted = await fetchAndExtractRows({
                url: YAD2_HOMEPAGE_URL,
                dealType: page.dealType,
            });
        }
        for (const row of extracted) {
            if (allRows.length >= scrapeMaxItems) break;
            if (!row || !row.id || seenIds.has(row.id)) continue;
            seenIds.add(row.id);
            allRows.push({
                ...row,
                externalSegmentKey: page.segmentKey,
            });
        }
    }

    if (allRows.length === 0) {
        const diagnosticSummary = diagnostics.length > 0
            ? `. Diagnostics: ${diagnostics.slice(0, 4).join(' | ')}`
            : '';
        return {
            rows: [],
            skipped: true,
            reason: segment
                ? `Scrape fallback returned zero listings for segment ${segment.key}${diagnosticSummary}`
                : `Scrape fallback returned zero listings${diagnosticSummary}`,
        };
    }

    return {
        rows: allRows,
        skipped: false,
        segmentKey: segment ? segment.key : 'all',
    };
};

const normalizeRow = (row) => {
    if (!row || typeof row !== 'object') return null;

    const mapped = {
        id: row.id ?? row._id ?? row.externalId ?? row.ad_number ?? row.adNumber,
        title: row.title ?? row.headline ?? row.subject,
        description: row.description ?? row.details ?? row.body,
        dealType: row.dealType ?? row.type ?? row.deal_type,
        price: row.price ?? row.priceNis ?? row.amount,
        rooms: row.rooms ?? row.bedrooms ?? row.roomCount,
        bathrooms: row.bathrooms ?? row.bathroomCount ?? row.bath,
        area: row.area ?? row.size ?? row.squareMeters ?? row.sqm,
        floor: row.floor ?? row.floorNumber,
        city: row.city ?? (row.address && row.address.city),
        street: row.street ?? (row.address && row.address.street),
        state: row.state ?? row.region ?? row.district,
        zip: row.zip ?? row.postalCode,
        country: row.country ?? 'Israel',
        images: row.images ?? row.imageUrls ?? row.photos,
        status: row.status ?? row.listingStatus ?? 'active',
        url: row.url ?? row.listingUrl ?? row.externalUrl,
        availableFrom: row.availableFrom ?? (row.dates && row.dates.availableFrom),
        listingDate: row.listingDate ?? row.publishedAt ?? row.createdAt,
    };

    return mapped;
};

const mapFeedToRows = (payload) => {
    if (Array.isArray(payload)) return payload.map(normalizeRow).filter(Boolean);
    if (payload && Array.isArray(payload.items)) return payload.items.map(normalizeRow).filter(Boolean);
    if (payload && Array.isArray(payload.listings)) return payload.listings.map(normalizeRow).filter(Boolean);
    if (payload && Array.isArray(payload.data)) return payload.data.map(normalizeRow).filter(Boolean);
    return [];
};

const fetchYad2FeedRows = async () => {
    const feedUrl = process.env.YAD2_SYNC_FEED_URL;
    const scrapeFallbackEnabled = parseBooleanEnv(process.env.YAD2_SCRAPE_FALLBACK_ENABLED, true);
    if (!feedUrl) {
        if (scrapeFallbackEnabled) {
            return scrapeYad2Listings();
        }
        return { rows: [], skipped: true, reason: 'YAD2_SYNC_FEED_URL not configured' };
    }

    const headers = {};
    if (process.env.YAD2_SYNC_AUTH_HEADER_NAME && process.env.YAD2_SYNC_AUTH_HEADER_VALUE) {
        headers[process.env.YAD2_SYNC_AUTH_HEADER_NAME] = process.env.YAD2_SYNC_AUTH_HEADER_VALUE;
    }

    const response = await fetch(feedUrl, { headers });
    if (!response.ok) {
        throw new Error(`Feed fetch failed (${response.status})`);
    }

    const payload = await response.json();
    const rows = mapFeedToRows(payload);
    if (!Array.isArray(rows) || rows.length === 0) {
        return { rows: [], skipped: true, reason: 'Feed returned zero listings' };
    }

    return { rows, skipped: false };
};

const fetchYad2SegmentedScrapeRows = async ({ segment }) => {
    const scrapeFallbackEnabled = parseBooleanEnv(process.env.YAD2_SCRAPE_FALLBACK_ENABLED, true);
    if (!scrapeFallbackEnabled) {
        return { rows: [], skipped: true, reason: 'Scrape fallback disabled', segmentKey: segment.key };
    }
    return scrapeYad2Listings({ segment });
};

const createYad2Scheduler = (logger = console) => {
    let timer = null;
    let inFlight = false;
    let segmentCursor = 0;
    const segments = parseSegmentList();
    const segmentedScrapeEnabled = parseSegmentedScrapeEnabled();
    const status = {
        enabled: process.env.YAD2_SYNC_ENABLED !== 'false',
        sourceTag: process.env.YAD2_SYNC_SOURCE_TAG || DEFAULT_SOURCE_TAG,
        syncMinutes: parseSyncMinutes(),
        feedUrlConfigured: Boolean(process.env.YAD2_SYNC_FEED_URL),
        scrapeFallbackEnabled: parseBooleanEnv(process.env.YAD2_SCRAPE_FALLBACK_ENABLED, true),
        segmentedScrapeEnabled,
        segments: segments.map((segment) => ({ key: segment.key, label: segment.label })),
        currentSegmentKey: segmentedScrapeEnabled && segments.length > 0 ? segments[0].key : null,
        lastSegmentRun: null,
        mirrorDeletesEnabled: parseBooleanEnv(process.env.YAD2_SYNC_MIRROR_DELETES, DEFAULT_MIRROR_MODE),
        inFlight: false,
        lastStartedAt: null,
        lastFinishedAt: null,
        lastTrigger: null,
        lastResult: null,
        lastError: null,
        startedAt: null,
    };
    const syncMinutes = status.syncMinutes;
    const sourceTag = status.sourceTag;
    const enabled = status.enabled;
    const mirrorDeletesEnabled = status.mirrorDeletesEnabled;

    const runSyncOnce = async (trigger = 'manual') => {
        if (!enabled) {
            return { skipped: true, reason: 'YAD2 sync disabled', trigger };
        }
        if (inFlight) {
            return { skipped: true, reason: 'YAD2 sync already in progress', trigger };
        }

        inFlight = true;
        status.inFlight = true;
        status.lastStartedAt = new Date().toISOString();
        status.lastTrigger = trigger;
        status.lastError = null;
        try {
            let feed;
            let segmentKey = null;
            const shouldUseSegmentedScrape = !process.env.YAD2_SYNC_FEED_URL && status.segmentedScrapeEnabled && segments.length > 0;
            if (shouldUseSegmentedScrape) {
                const segment = segments[segmentCursor % segments.length];
                segmentCursor = (segmentCursor + 1) % segments.length;
                status.currentSegmentKey = segment.key;
                feed = await fetchYad2SegmentedScrapeRows({ segment });
                segmentKey = segment.key;
                status.lastSegmentRun = {
                    key: segment.key,
                    label: segment.label,
                    at: new Date().toISOString(),
                };
            } else {
                feed = await fetchYad2FeedRows();
            }
            if (feed.skipped) {
                const skippedResult = {
                    skipped: true,
                    reason: feed.reason,
                    trigger,
                    sourceTag,
                    ...(segmentKey ? { segmentKey } : {}),
                };
                status.lastResult = skippedResult;
                return skippedResult;
            }
            const result = await importYad2Listings({
                rows: feed.rows,
                upsert: true,
                sourceTag,
            });
            const successfulWrites = Number(result.created || 0) + Number(result.updated || 0);
            if (successfulWrites === 0 && Number(result.total || 0) > 0) {
                const skipReason = `Import wrote zero listings (${result.skipped || 0}/${result.total || 0} skipped).`;
                const skippedResult = {
                    skipped: true,
                    reason: skipReason,
                    trigger,
                    sourceTag,
                    ...(segmentKey ? { segmentKey } : {}),
                    importSummary: result,
                };
                status.lastResult = skippedResult;
                return skippedResult;
            }

            let pruned = 0;
            if (mirrorDeletesEnabled) {
                const externalIds = feed.rows
                    .map((row) => (row && typeof row.id === 'string' ? row.id.trim() : String(row && row.id || '').trim()))
                    .filter(Boolean);
                if (externalIds.length > 0) {
                    const pruneFilter = {
                        externalSource: sourceTag,
                        externalId: { $nin: externalIds },
                    };
                    if (segmentKey) {
                        pruneFilter.externalSegmentKey = segmentKey;
                    }
                    const deleteResult = await Property.deleteMany(pruneFilter);
                    pruned = Number(deleteResult && deleteResult.deletedCount ? deleteResult.deletedCount : 0);
                }
            }
            const syncResult = {
                trigger,
                sourceTag,
                mode: process.env.YAD2_SYNC_FEED_URL
                    ? 'feed-url'
                    : (segmentKey ? 'segmented-scrape' : 'scrape-fallback'),
                ...(segmentKey ? { segmentKey } : {}),
                fetched: feed.rows.length,
                pruned,
                ...result,
            };
            status.lastResult = syncResult;
            return syncResult;
        } catch (err) {
            status.lastError = err.message;
            throw err;
        } finally {
            inFlight = false;
            status.inFlight = false;
            status.lastFinishedAt = new Date().toISOString();
        }
    };

    const start = () => {
        if (!enabled) {
            logger.log('[yad2-sync] Disabled via YAD2_SYNC_ENABLED=false');
            return;
        }
        if (timer) return;
        const intervalMs = syncMinutes * 60 * 1000;
        status.startedAt = new Date().toISOString();
        status.feedUrlConfigured = Boolean(process.env.YAD2_SYNC_FEED_URL);
        status.scrapeFallbackEnabled = parseBooleanEnv(process.env.YAD2_SCRAPE_FALLBACK_ENABLED, true);
        status.segmentedScrapeEnabled = segmentedScrapeEnabled;
        timer = setInterval(async () => {
            try {
                const result = await runSyncOnce('scheduled');
                if (result.skipped) {
                    logger.log(`[yad2-sync] Scheduled run skipped: ${result.reason}`);
                    return;
                }
                logger.log(
                    `[yad2-sync] Scheduled sync complete (fetched=${result.fetched}, created=${result.created}, updated=${result.updated}, skipped=${result.skipped}).`
                );
            } catch (err) {
                logger.error('[yad2-sync] Scheduled sync failed:', err.message);
            }
        }, intervalMs);
        logger.log(`[yad2-sync] Scheduler started (every ${syncMinutes} minute(s), sourceTag=${sourceTag}).`);
    };

    const stop = () => {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    };

    return {
        enabled,
        sourceTag,
        syncMinutes,
        start,
        stop,
        runSyncOnce,
        getStatus: () => ({
            ...status,
            timerActive: Boolean(timer),
            inFlight: status.inFlight,
            feedUrlConfigured: Boolean(process.env.YAD2_SYNC_FEED_URL),
            scrapeFallbackEnabled: parseBooleanEnv(process.env.YAD2_SCRAPE_FALLBACK_ENABLED, true),
            segmentedScrapeEnabled: parseSegmentedScrapeEnabled(),
            currentSegmentKey: status.currentSegmentKey,
        }),
    };
};

module.exports = {
    createYad2Scheduler,
};
