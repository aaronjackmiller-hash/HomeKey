'use strict';

const mongoose = require('mongoose');

const Yad2FallbackFeedSchema = new mongoose.Schema(
    {
        segmentKey: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            default: 'all',
        },
        sourceLabel: {
            type: String,
            trim: true,
            default: 'manual-upload',
        },
        items: {
            type: [mongoose.Schema.Types.Mixed],
            default: [],
        },
    },
    { timestamps: true }
);

Yad2FallbackFeedSchema.index({ segmentKey: 1 }, { unique: true });

module.exports = mongoose.model('Yad2FallbackFeed', Yad2FallbackFeedSchema);
