'use strict';

const Yad2FallbackFeed = require('../models/Yad2FallbackFeed');

const normalizeSegmentKey = (value) =>
    String(value || 'all')
        .trim()
        .toLowerCase() || 'all';

const normalizeRows = (items) => {
    if (!Array.isArray(items)) return [];
    return items
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({ ...item }));
};

const readStoredItems = (doc) => {
    if (!doc || typeof doc !== 'object') return [];
    if (Array.isArray(doc.items)) return doc.items;
    // Backward-compatibility for any older documents that used "rows".
    if (Array.isArray(doc.rows)) return doc.rows;
    return [];
};

const upsertYad2FallbackFeedRows = async ({
    segmentKey = 'all',
    items,
    updatedBy = null,
    sourceLabel = 'admin-upload',
}) => {
    const normalizedItems = normalizeRows(items);
    if (normalizedItems.length === 0) {
        throw new Error('Fallback feed items must be a non-empty array');
    }
    const normalizedSegmentKey = normalizeSegmentKey(segmentKey);
    const now = new Date();
    const update = {
        segmentKey: normalizedSegmentKey,
        items: normalizedItems,
        sourceLabel: String(sourceLabel || 'admin-upload').trim() || 'admin-upload',
        updatedAt: now,
        ...(updatedBy ? { updatedBy } : {}),
    };
    const saved = await Yad2FallbackFeed.findOneAndUpdate(
        { segmentKey: normalizedSegmentKey },
        { $set: update, $setOnInsert: { createdAt: now } },
        { upsert: true, new: true }
    );
    return saved;
};

const getYad2FallbackFeedRowsForSegment = async (segmentKey, { limit = null } = {}) => {
    const normalizedSegmentKey = normalizeSegmentKey(segmentKey);
    const exact = await Yad2FallbackFeed.findOne({ segmentKey: normalizedSegmentKey }).lean();
    const exactItems = readStoredItems(exact);
    const sourceDoc = (exact && exactItems.length > 0)
        ? exact
        : await Yad2FallbackFeed.findOne({ segmentKey: 'all' }).lean();
    const sourceItems = readStoredItems(sourceDoc);
    if (sourceItems.length === 0) return [];
    if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
        return sourceItems.slice(0, Math.floor(limit));
    }
    return sourceItems;
};

const getFallbackRowsForSegment = async ({ segmentKey = null, limit = null } = {}) => {
    return getYad2FallbackFeedRowsForSegment(segmentKey, { limit });
};

const getYad2FallbackFeedSummary = async () => {
    const docs = await Yad2FallbackFeed.find({}).sort({ updatedAt: -1 }).lean();
    const segments = docs.map((doc) => ({
        segmentKey: doc.segmentKey,
        rowsCount: readStoredItems(doc).length,
        updatedAt: doc.updatedAt || null,
        sourceLabel: doc.sourceLabel || null,
    }));
    const totalRows = segments.reduce((sum, segment) => sum + segment.rowsCount, 0);
    return {
        totalSegments: segments.length,
        totalRows,
        segments,
    };
};

const bootstrapYad2FallbackFeedIfEmpty = async ({
    items,
    sourceLabel = 'startup-auto-bootstrap',
}) => {
    const existingCount = await Yad2FallbackFeed.countDocuments({});
    if (existingCount > 0) {
        return { bootstrapped: false, reason: 'already-populated' };
    }
    const normalizedItems = normalizeRows(items);
    if (normalizedItems.length === 0) {
        return { bootstrapped: false, reason: 'no-items-supplied' };
    }
    await upsertYad2FallbackFeedRows({
        segmentKey: 'all',
        items: normalizedItems,
        sourceLabel,
    });
    return { bootstrapped: true, segmentKey: 'all', rows: normalizedItems.length };
};

module.exports = {
    upsertYad2FallbackFeedRows,
    getYad2FallbackFeedRowsForSegment,
    getYad2FallbackFeedSummary,
    getFallbackRowsForSegment,
    bootstrapYad2FallbackFeedIfEmpty,
};
