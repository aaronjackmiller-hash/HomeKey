'use strict';

/**
 * SeekerProfile.js
 * path: backend/models/SeekerProfile.js
 *
 * A seeker profile is created by someone who is LOOKING for a room in a
 * shared apartment. It is the counterpart to RoommateListing (which is
 * created by someone who HAS an apartment and wants a roommate).
 *
 * Seekers are browseable by room listers — bidirectional discovery is the
 * standard pattern on SpareRoom, Diggz, and Roomi. Listers contact seekers
 * via WhatsApp directly from the seeker card.
 *
 * Data maps directly from the FilterMenu seeker form fields.
 * Auto-expires after 30 days (half of RoommateListing) since seekers
 * typically find a room faster than listers fill a room.
 */

const mongoose = require('mongoose');

const SeekerProfileSchema = new mongoose.Schema(
    {
        // ── Contact ──────────────────────────────────────────────────────────
        // Phone is required — listers contact seekers via WhatsApp.
        // The actual number is never shown in plain text on the public card;
        // it's used only to build the wa.me/ link.
        contact: {
            phone: {
                type: String,
                trim: true,
                required: [true, 'Phone number is required so room listers can reach you'],
            },
            preferredMethod: {
                type: String,
                enum: ['phone', 'whatsapp'],
                default: 'whatsapp',
            },
        },

        // ── Identity ─────────────────────────────────────────────────────────
        // First name only — shown on the public card (e.g. "Tamar is looking…")
        firstName: {
            type: String,
            trim: true,
            maxlength: [40, 'First name too long'],
        },

        // ── Location preference ──────────────────────────────────────────────
        locationPreference: {
            city: { type: String, trim: true },
            neighborhood: { type: String, trim: true },
        },

        // ── Budget ───────────────────────────────────────────────────────────
        // Monthly rent share the seeker is prepared to pay (their portion only).
        budgetMin: { type: Number, min: 0, default: 0 },
        budgetMax: { type: Number, min: 0 },

        // ── Timing ───────────────────────────────────────────────────────────
        moveInDate: { type: Date },
        moveInFlexibility: {
            type: String,
            enum: ['strict', '3-days', '7-days'],
            default: 'strict',
        },

        // ── What they need ───────────────────────────────────────────────────
        // Bedrooms in the apartment (seeker may need a 2-bed for themselves +
        // a home office, for example).
        bedroomsNeeded: {
            type: Number,
            min: 1,
            default: 1,
        },

        // How many other people (besides themselves) the seeker is OK sharing with
        maxOthers: {
            type: Number,
            min: 1,
            default: 1,
        },

        // Minimum lease they're looking for in months
        leaseDurationMonths: {
            type: Number,
            min: 1,
            default: 6,
        },

        // ── Lifestyle ────────────────────────────────────────────────────────
        genderPreference: {
            type: String,
            enum: ['men', 'women', 'no-preference'],
            default: 'no-preference',
        },

        lifestyle: {
            smoking: {
                type: String,
                // Maps from FilterMenu: Anywhere → anywhere, Outside only → outside-only, Not at all → not-at-all
                enum: ['anywhere', 'outside-only', 'not-at-all'],
                default: 'not-at-all',
            },
            kosherKitchen: {
                type: String,
                enum: ['yes', 'no', 'open-to-it'],
                default: 'open-to-it',
            },
        },

        // ── Desired amenities ────────────────────────────────────────────────
        // Same vocabulary as RoommateListing so filtering is consistent.
        amenities: {
            type: [{ type: String, trim: true }],
            default: [],
        },

        // ── Status & lifecycle ───────────────────────────────────────────────
        status: {
            type: String,
            enum: ['active', 'matched', 'inactive'],
            default: 'active',
        },

        // Auto-expire after 30 days
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
    },
    { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
SeekerProfileSchema.index({ 'locationPreference.city': 1, status: 1, createdAt: -1 });
SeekerProfileSchema.index({ genderPreference: 1, status: 1 });
SeekerProfileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('SeekerProfile', SeekerProfileSchema);
