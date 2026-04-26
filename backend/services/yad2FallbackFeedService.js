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

const upsertFallbackRows = async ({
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

const getFallbackRows = async ({ segmentKey = null } = {}) => {
    if (segmentKey) {
        const normalizedSegmentKey = normalizeSegmentKey(segmentKey);
        const exact = await Yad2FallbackFeed.findOne({ segmentKey: normalizedSegmentKey }).lean();
        if (exact && Array.isArray(exact.rows) && exact.rows.length > 0) return exact;
        const shared = await Yad2FallbackFeed.findOne({ segmentKey: 'all' }).lean();
        return shared || null;
    }
    const rows = await Yad2FallbackFeed.find({}).sort({ updatedAt: -1 }).lean();
    return rows;
};

module.exports = {
    upsertFallbackRows,
    getFallbackRows,
};
