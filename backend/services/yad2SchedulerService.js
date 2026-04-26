'use strict';

const { importYad2Listings } = require('./yad2ImportService');

const DEFAULT_SYNC_MINUTES = 15;
const MIN_SYNC_MINUTES = 5;
const MAX_SYNC_MINUTES = 180;
const DEFAULT_SOURCE_TAG = 'yad2-live-sync';

const parseSyncMinutes = () => {
    const raw = Number(process.env.YAD2_SYNC_INTERVAL_MINUTES || DEFAULT_SYNC_MINUTES);
    if (!Number.isFinite(raw)) return DEFAULT_SYNC_MINUTES;
    return Math.max(MIN_SYNC_MINUTES, Math.min(MAX_SYNC_MINUTES, Math.floor(raw)));
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
    if (!feedUrl) {
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
            const syncResult = {
                trigger,
                sourceTag,
                fetched: feed.rows.length,
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
        }),
    };
};

module.exports = {
    createYad2Scheduler,
};
