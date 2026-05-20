'use strict';

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters long'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
        },
        phone: {
            type: String,
            trim: true,
        },
        whatsapp: {
            type: String,
            trim: true,
        },
        preferredContactMethod: {
            type: String,
            enum: ['email', 'whatsapp', 'phone'],
            default: 'email',
        },
        notifications: {
            sendThankYou: { type: Boolean, default: true },
            sendExpiryReminder: { type: Boolean, default: true },
        },
        role: {
            type: String,
            enum: ['buyer', 'seller', 'agent', 'admin'],
            default: 'buyer',
        },
        googleSub: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
        },
        appleSub: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
        },
        agency: {
            type: String,
            trim: true,
        },
        bio: {
            type: String,
            trim: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters long'],
            select: false,
        },
        resetPasswordTokenHash: {
            type: String,
            select: false,
        },
        resetPasswordExpiresAt: {
            type: Date,
            select: false,
        },
        passkeys: [
            {
                credentialID: {
                    type: String,
                    required: true,
                    trim: true,
                },
                publicKey: {
                    type: String,
                    required: true,
                    select: false,
                },
                counter: {
                    type: Number,
                    default: 0,
                    min: 0,
                },
                transports: [{
                    type: String,
                    trim: true,
                }],
                deviceType: {
                    type: String,
                    trim: true,
                },
                backedUp: {
                    type: Boolean,
                    default: false,
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
                lastUsedAt: {
                    type: Date,
                },
            },
        ],
        passkeyChallenge: {
            type: String,
            select: false,
        },
        passkeyChallengeExpiresAt: {
            type: Date,
            select: false,
        },
        listings: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Property',
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
