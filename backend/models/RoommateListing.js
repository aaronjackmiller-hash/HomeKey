'use strict';

/**
 * RoommateListing.js
 *
 * Separate collection for roommate listings — intentionally kept apart
 * from the main Property collection so Sale/Rental inventory stays clean.
 *
 * A roommate listing is created by someone who HAS an apartment and is
 * looking for a roommate to share it with. It is NOT a full property listing.
 *
 * Fields deliberately excluded from Property schema:
 *   - type (always 'roommates' by definition)
 *   - externalSource / externalId (no Yad2 sync for roommates)
 *   - agent / enterprise fields
 *   - showings (not relevant for roommate matching)
 *
 * Future: when /roommates gets its own URL and SEO treatment, this model
 * is already structured to support a dedicated RoommatesPage.
 */

const mongoose = require('mongoose');
const { buildLocalizedAddress } = require('../utils/addressLocalization');

const RoommateListingSchema = new mongoose.Schema(
    {
        // ── Contact ─────────────────────────────────────────────────────────
        // Captured at the end of the wizard — phone is required, email optional.
        // For anonymous listers (no account), owner will be null.
        contact: {
            phone: {
                type: String,
                trim: true,
                required: [true, 'Phone number is required so renters can reach you'],
            },
            email: {
                type: String,
                trim: true,
                lowercase: true,
            },
            preferredMethod: {
                type: String,
                enum: ['phone', 'whatsapp', 'email'],
                default: 'phone',
            },
        },

        // ── Ownership ────────────────────────────────────────────────────────
        // Null for anonymous listers. Populated when user creates account later.
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        // ── Apartment details ────────────────────────────────────────────────
        address: {
            street: { type: String, trim: true },
            streetNumber: { type: String, trim: true },
            neighborhood: { type: String, trim: true },
            city: {
                type: String,
                trim: true,
                required: [true, 'City is required'],
            },
            state: { type: String, trim: true },
            zip: { type: String, trim: true },
            country: { type: String, trim: true, default: 'Israel' },
            // Coordinates for map pins
            lat: { type: Number },
            lng: { type: Number },
            localized: {
                he: {
                    street: { type: String, trim: true },
                    streetNumber: { type: String, trim: true },
                    neighborhood: { type: String, trim: true },
                    city: { type: String, trim: true },
                    state: { type: String, trim: true },
                    country: { type: String, trim: true },
                },
                en: {
                    street: { type: String, trim: true },
                    streetNumber: { type: String, trim: true },
                    neighborhood: { type: String, trim: true },
                    city: { type: String, trim: true },
                    state: { type: String, trim: true },
                    country: { type: String, trim: true },
                },
            },
        },

        // Monthly rent share the incoming roommate will pay
        rentShare: {
            type: Number,
            required: [true, 'Rent share is required'],
            min: [0, 'Rent share must be >= 0'],
        },

        // Monthly utilities estimate (electricity, water, internet, vaad) —
        // single combined total. Kept for backward compatibility with any
        // existing filtering/display logic that just wants one number, and
        // as a fallback display for listings created before the itemized
        // breakdown below existed.
        utilitiesEstimate: {
            type: Number,
            min: [0, 'Utilities estimate must be >= 0'],
            default: 0,
        },

        // Itemized breakdown of the above — shown on the listing detail page
        // so renters can see exactly what's included instead of one opaque
        // number. Listings created before this field existed simply won't
        // have it populated; the detail page falls back to utilitiesEstimate
        // in that case.
        utilities: {
            electricity: { type: Number, min: [0, 'Electricity estimate must be >= 0'], default: 0 },
            water: { type: Number, min: [0, 'Water estimate must be >= 0'], default: 0 },
            internet: { type: Number, min: [0, 'Internet estimate must be >= 0'], default: 0 },
            vaad: { type: Number, min: [0, 'VAAD estimate must be >= 0'], default: 0 },
        },

        // Total bedrooms in the apartment
        totalBedrooms: {
            type: Number,
            required: [true, 'Total bedrooms is required'],
            min: [1, 'Must have at least 1 bedroom'],
        },

        // Total bathrooms in the apartment
        totalBathrooms: {
            type: Number,
            min: [1, 'Must have at least 1 bathroom'],
            default: 1,
        },

        // Apartment size in square meters
        sizeSqm: {
            type: Number,
            min: [0, 'Size must be >= 0'],
        },

        // When the room is available
        dateAvailable: {
            type: Date,
            required: [true, 'Available from date is required'],
        },

        // Minimum lease length in months
        minLeaseMonths: {
            type: Number,
            min: [1, 'Minimum lease must be at least 1 month'],
            default: 6,
        },

        // Free-text description of the apartment and vibe
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
        },

        // ── Amenities ────────────────────────────────────────────────────────
        // Same vocabulary as Property listings, so the searcher can filter
        // and the listing detail page can display them consistently.
        amenities: {
            type: [{
                type: String,
                trim: true,
                enum: [
                    'elevator', 'parking', 'pets', 'disabled-access', 'renovated',
                    'furnished', 'mamad', 'oven', 'balcony', 'stovetop',
                    'laundry-facilities', 'in-unit-washer-dryer',
                ],
            }],
            default: [],
        },

        // ── Photos ───────────────────────────────────────────────────────────
        // Max 3 photos — apartment and common areas only, no profile photos.
        // Stored as URLs (uploaded to cloud storage).
        images: {
            type: [{ type: String, trim: true }],
            validate: {
                validator: (arr) => arr.length <= 3,
                message: 'Maximum 3 photos allowed per roommate listing',
            },
        },

        // ── Gender preference (mutual) ───────────────────────────────────────
        // What gender the lister is comfortable living with.
        // 'no-preference' means anyone welcome.
        genderPreference: {
            type: String,
            enum: ['men', 'women', 'no-preference'],
            default: 'no-preference',
        },

        // ── Lifestyle compatibility ──────────────────────────────────────────
        lifestyle: {
            smoking: {
                type: String,
                enum: ['not-allowed', 'outside-only', 'allowed'],
                default: 'not-allowed',
            },
            pets: {
                type: String,
                enum: ['not-allowed', 'allowed', 'have-pets'],
                default: 'not-allowed',
            },
            kosherKitchen: {
                type: String,
                enum: ['yes', 'no', 'open-to-it'],
                default: 'no',
            },
            // Free-text field for Israeli cultural nuance —
            // Shabbat observance, student apartment, WFH, etc.
            vibe: {
                type: String,
                trim: true,
                maxlength: [300, 'Vibe description cannot exceed 300 characters'],
            },
        },

        // ── Status & lifecycle ───────────────────────────────────────────────
        status: {
            type: String,
            enum: ['active', 'filled', 'inactive'],
            default: 'active',
        },

        // Auto-expire after 60 days if not renewed
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },

        // ── Demand signals ───────────────────────────────────────────────────
        // Rolling click count — incremented by POST /api/roommates/demand
        demandClickCount: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────

// Primary search index — city + status + dateAvailable
RoommateListingSchema.index({ 'address.city': 1, status: 1, dateAvailable: 1 });

// Gender preference filtering
RoommateListingSchema.index({ genderPreference: 1, status: 1 });

// Owner lookup (for managing your own listings)
RoommateListingSchema.index({ owner: 1 }, { sparse: true });

// Auto-expire TTL index — MongoDB will automatically remove expired listings
RoommateListingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ── Hooks ────────────────────────────────────────────────────────────────────

RoommateListingSchema.pre('validate', function localizeAddressBeforeValidate(next) {
    if (!this.address || typeof this.address !== 'object') return next();
    this.address = buildLocalizedAddress(this.address);
    return next();
});

module.exports = mongoose.model('RoommateListing', RoommateListingSchema);
