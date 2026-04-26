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
        rows: normalizedItems,
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
    const sourceDoc = (exact && Array.isArray(exact.rows) && exact.rows.length > 0)
        ? exact
        : await Yad2FallbackFeed.findOne({ segmentKey: 'all' }).lean();
    if (!sourceDoc || !Array.isArray(sourceDoc.rows)) return [];
    if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
        return sourceDoc.rows.slice(0, Math.floor(limit));
    }
    return sourceDoc.rows;
};

const getFallbackRowsForSegment = async ({ segmentKey = null, limit = null } = {}) => {
    return getYad2FallbackFeedRowsForSegment(segmentKey, { limit });
};

const getYad2FallbackFeedSummary = async () => {
    const docs = await Yad2FallbackFeed.find({}).sort({ updatedAt: -1 }).lean();
    const segments = docs.map((doc) => ({
        segmentKey: doc.segmentKey,
        rowsCount: Array.isArray(doc.rows) ? doc.rows.length : 0,
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

module.exports = {
    upsertYad2FallbackFeedRows,
    getYad2FallbackFeedRowsForSegment,
    getYad2FallbackFeedSummary,
    getFallbackRowsForSegment,
};
