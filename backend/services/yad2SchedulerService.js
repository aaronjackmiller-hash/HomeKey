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
const YAD2_RENT_URL = 'https://www.yad2.co.il/realestate/rent';
const YAD2_FORSALE_URL = 'https://www.yad2.co.il/realestate/forsale';
const SCRAPE_USER_AGENT = 'Mozilla/5.0 (compatible; HomeKeyBot/1.0; +https://homekey.local)';

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
    const anchorRegex = /<a[^>]+href="([^"]*\/realestate\/item\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match = anchorRegex.exec(html);
    while (match && rows.length < maxItems) {
        const href = normalizeHref(match[1]);
        if (href) {
            const row = buildFallbackRow({ href, anchorText: match[2], dealType });
            if (row && !seenIds.has(row.id)) {
                seenIds.add(row.id);
                rows.push(row);
            }
        }
        match = anchorRegex.exec(html);
    }

    if (rows.length > 0) return rows;

    // Fallback extractor in case anchor markup changes and nested content is removed.
    const hrefRegex = /\/realestate\/item\/[a-z0-9-]+\/[a-z0-9]+(?:\?[^"'\s<]*)?/gi;
    let hrefMatch = hrefRegex.exec(html);
    while (hrefMatch && rows.length < maxItems) {
        const href = normalizeHref(hrefMatch[0]);
        if (href) {
            const row = buildFallbackRow({ href, anchorText: '', dealType });
            if (row && !seenIds.has(row.id)) {
                seenIds.add(row.id);
                rows.push(row);
            }
        }
        hrefMatch = hrefRegex.exec(html);
    }
    return rows;
};

const scrapeYad2Listings = async () => {
    const scrapeMaxItems = parseScrapeMaxItems();
    const pages = [
        { url: YAD2_RENT_URL, dealType: 'rental' },
        { url: YAD2_FORSALE_URL, dealType: 'sale' },
    ];
    const perPageLimit = Math.max(1, Math.floor(scrapeMaxItems / pages.length));
    const allRows = [];
    const seenIds = new Set();

    for (const page of pages) {
        const response = await fetch(page.url, {
            headers: {
                'User-Agent': SCRAPE_USER_AGENT,
                Accept: 'text/html,application/xhtml+xml',
            },
            signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) {
            throw new Error(`Scrape fetch failed (${response.status}) for ${page.dealType}`);
        }
        const html = await response.text();
        const extracted = extractRowsFromYad2Html({
            html,
            dealType: page.dealType,
            maxItems: perPageLimit,
        });
        for (const row of extracted) {
            if (allRows.length >= scrapeMaxItems) break;
            if (!row || !row.id || seenIds.has(row.id)) continue;
            seenIds.add(row.id);
            allRows.push(row);
        }
    }

    if (allRows.length === 0) {
        return { rows: [], skipped: true, reason: 'Scrape fallback returned zero listings' };
    }

    return { rows: allRows, skipped: false };
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
    const scrapeFallbackEnabled = parseBooleanEnv(process.env.YAD2_SCRAPE_FALLBACK_ENABLED, false);
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

const createYad2Scheduler = (logger = console) => {
    let timer = null;
    let inFlight = false;
    const status = {
        enabled: process.env.YAD2_SYNC_ENABLED !== 'false',
        sourceTag: process.env.YAD2_SYNC_SOURCE_TAG || DEFAULT_SOURCE_TAG,
        syncMinutes: parseSyncMinutes(),
        feedUrlConfigured: Boolean(process.env.YAD2_SYNC_FEED_URL),
        scrapeFallbackEnabled: parseBooleanEnv(process.env.YAD2_SCRAPE_FALLBACK_ENABLED, false),
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
            const feed = await fetchYad2FeedRows();
            if (feed.skipped) {
                const skippedResult = { skipped: true, reason: feed.reason, trigger, sourceTag };
                status.lastResult = skippedResult;
                return skippedResult;
            }
            const result = await importYad2Listings({
                rows: feed.rows,
                upsert: true,
                sourceTag,
            });

            let pruned = 0;
            if (mirrorDeletesEnabled) {
                const externalIds = feed.rows
                    .map((row) => (row && typeof row.id === 'string' ? row.id.trim() : String(row && row.id || '').trim()))
                    .filter(Boolean);
                if (externalIds.length > 0) {
                    const deleteResult = await Property.deleteMany({
                        externalSource: sourceTag,
                        externalId: { $nin: externalIds },
                    });
                    pruned = Number(deleteResult && deleteResult.deletedCount ? deleteResult.deletedCount : 0);
                }
            }
            const syncResult = {
                trigger,
                sourceTag,
                mode: process.env.YAD2_SYNC_FEED_URL ? 'feed-url' : 'scrape-fallback',
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
        status.scrapeFallbackEnabled = parseBooleanEnv(process.env.YAD2_SCRAPE_FALLBACK_ENABLED, false);
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
            scrapeFallbackEnabled: parseBooleanEnv(process.env.YAD2_SCRAPE_FALLBACK_ENABLED, false),
        }),
    };
};

module.exports = {
    createYad2Scheduler,
};
