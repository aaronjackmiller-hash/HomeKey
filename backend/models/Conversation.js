'use strict';

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        text: {
            type: String,
            trim: true,
            required: true,
            maxlength: 2000,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

const ConversationSchema = new mongoose.Schema(
    {
        property: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Property',
            required: true,
            index: true,
        },
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
        ],
        participantKey: {
            type: String,
            required: true,
            index: true,
        },
        messages: [MessageSchema],
        lastMessageAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        lastMessageText: {
            type: String,
            trim: true,
            maxlength: 500,
            default: '',
        },
    },
    { timestamps: true }
);

ConversationSchema.index({ property: 1, participantKey: 1 }, { unique: true });
ConversationSchema.index({ participants: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
