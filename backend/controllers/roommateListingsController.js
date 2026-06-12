'use strict';

/**
 * roommateListingsController.js
 *
 * Handles CRUD for roommate listings plus the demand signal endpoint.
 * Follows the same pattern as the existing property controllers.
 */

const RoommateListing = require('../models/RoommateListing');

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALLOWED_GENDER_PREFS = ['men', 'women', 'no-preference'];
const ALLOWED_SMOKING = ['not-allowed', 'outside-only', 'allowed'];
const ALLOWED_PETS = ['not-allowed', 'allowed', 'have-pets'];
const ALLOWED_KOSHER = ['yes', 'no', 'open-to-it'];
const ALLOWED_STATUSES = ['active', 'filled', 'inactive'];

const parsePositiveInt = (value, fallback) => {
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};

const parsePositiveNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
};

// ── GET /api/roommates ────────────────────────────────────────────────────────
// Public. Returns active roommate listings with optional filters.

exports.getListings = async (req, res) => {
    try {
        const {
            city,
            genderPreference,
            minRent,
            maxRent,
            bedrooms,
            smoking,
            pets,
            kosher,
            page = 1,
            limit = 50,
        } = req.query;

        const filter = { status: 'active', expiresAt: { $gt: new Date() } };

        if (city && typeof city === 'string' && city.trim()) {
            filter['address.city'] = { $regex: city.trim(), $options: 'i' };
        }

        if (genderPreference && ALLOWED_GENDER_PREFS.includes(genderPreference)) {
            // Return listings that are compatible — either exact match or no-preference
            filter.$or = [
                { genderPreference },
                { genderPreference: 'no-preference' },
            ];
        }

        const minRentNum = parsePositiveNumber(minRent);
        const maxRentNum = parsePositiveNumber(maxRent);
        if (minRentNum !== null || maxRentNum !== null) {
            filter.rentShare = {};
            if (minRentNum !== null) filter.rentShare.$gte = minRentNum;
            if (maxRentNum !== null) filter.rentShare.$lte = maxRentNum;
        }

        if (bedrooms) {
            const bedroomsNum = parsePositiveInt(bedrooms, null);
            if (bedroomsNum !== null) filter.totalBedrooms = bedroomsNum;
        }

        if (smoking && ALLOWED_SMOKING.includes(smoking)) {
            filter['lifestyle.smoking'] = smoking;
        }
        if (pets && ALLOWED_PETS.includes(pets)) {
            filter['lifestyle.pets'] = pets;
        }
        if (kosher && ALLOWED_KOSHER.includes(kosher)) {
            filter['lifestyle.kosherKitchen'] = kosher;
        }

        const pageNum = parsePositiveInt(page, 1);
        const limitNum = Math.min(parsePositiveInt(limit, 50), 100);
        const skip = (pageNum - 1) * limitNum;

        const [listings, total] = await Promise.all([
            RoommateListing.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            RoommateListing.countDocuments(filter),
        ]);

        return res.json({
            success: true,
            data: listings,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
        });
    } catch (err) {
        console.error('[roommateListings] getListings error:', err);
        return res.status(500).json({ message: 'Failed to load roommate listings' });
    }
};

// ── GET /api/roommates/stats ──────────────────────────────────────────────────
// Public. Returns aggregate counts for the stats banner.

exports.getStats = async (req, res) => {
    try {
        const activeFilter = { status: 'active', expiresAt: { $gt: new Date() } };

        const [availableCount, totalDemandClicks] = await Promise.all([
            RoommateListing.countDocuments(activeFilter),
            RoommateListing.aggregate([
                { $match: activeFilter },
                { $group: { _id: null, total: { $sum: '$demandClickCount' } } },
            ]),
        ]);

        const searcherCount = totalDemandClicks[0]?.total ?? 0;

        return res.json({
            success: true,
            availableRooms: availableCount,
            // Rolling demand proxy — total clicks across all active listings.
            // Replace with a dedicated searcher-sessions collection later for precision.
            searcherCount,
        });
    } catch (err) {
        console.error('[roommateListings] getStats error:', err);
        return res.status(500).json({ message: 'Failed to load roommate stats' });
    }
};

// ── GET /api/roommates/:id ────────────────────────────────────────────────────
// Public. Returns a single listing by ID.

exports.getListing = async (req, res) => {
    try {
        const listing = await RoommateListing.findById(req.params.id).lean();
        if (!listing) {
            return res.status(404).json({ message: 'Roommate listing not found' });
        }
        return res.json({ success: true, data: listing });
    } catch (err) {
        console.error('[roommateListings] getListing error:', err);
        return res.status(500).json({ message: 'Failed to load listing' });
    }
};

// ── POST /api/roommates ───────────────────────────────────────────────────────
// Public (anonymous allowed). Creates a new roommate listing.

exports.createListing = async (req, res) => {
    try {
        const {
            contact,
            address,
            rentShare,
            utilitiesEstimate,
            totalBedrooms,
            sizeSqm,
            dateAvailable,
            minLeaseMonths,
            description,
            images,
            genderPreference,
            lifestyle,
        } = req.body;

        // Validate required fields
        if (!contact?.phone?.trim()) {
            return res.status(400).json({ message: 'Phone number is required' });
        }
        if (!address?.city?.trim()) {
            return res.status(400).json({ message: 'City is required' });
        }
        if (rentShare == null || parsePositiveNumber(rentShare) === null) {
            return res.status(400).json({ message: 'Valid rent share is required' });
        }
        if (!totalBedrooms || parsePositiveInt(totalBedrooms, null) === null) {
            return res.status(400).json({ message: 'Total bedrooms is required' });
        }
        if (!dateAvailable) {
            return res.status(400).json({ message: 'Available from date is required' });
        }

        // Validate images — max 3
        if (images && Array.isArray(images) && images.length > 3) {
            return res.status(400).json({ message: 'Maximum 3 photos allowed' });
        }

        const listing = new RoommateListing({
            contact: {
                phone: contact.phone.trim(),
                email: contact.email?.trim() || undefined,
                preferredMethod: contact.preferredMethod || 'phone',
            },
            // If user is authenticated, attach their ID
            owner: req.user?._id || null,
            address,
            rentShare: parsePositiveNumber(rentShare),
            utilitiesEstimate: parsePositiveNumber(utilitiesEstimate) ?? 0,
            totalBedrooms: parsePositiveInt(totalBedrooms, 1),
            sizeSqm: sizeSqm ? parsePositiveNumber(sizeSqm) : undefined,
            dateAvailable: new Date(dateAvailable),
            minLeaseMonths: minLeaseMonths ? parsePositiveInt(minLeaseMonths, 6) : 6,
            description: description?.trim() || undefined,
            images: Array.isArray(images) ? images.slice(0, 3) : [],
            genderPreference: ALLOWED_GENDER_PREFS.includes(genderPreference)
                ? genderPreference
                : 'no-preference',
            lifestyle: {
                smoking: ALLOWED_SMOKING.includes(lifestyle?.smoking)
                    ? lifestyle.smoking
                    : 'not-allowed',
                pets: ALLOWED_PETS.includes(lifestyle?.pets)
                    ? lifestyle.pets
                    : 'not-allowed',
                kosherKitchen: ALLOWED_KOSHER.includes(lifestyle?.kosherKitchen)
                    ? lifestyle.kosherKitchen
                    : 'no',
                vibe: lifestyle?.vibe?.trim() || undefined,
            },
        });

        await listing.save();

        return res.status(201).json({ success: true, data: listing });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        console.error('[roommateListings] createListing error:', err);
        return res.status(500).json({ message: 'Failed to create listing' });
    }
};

// ── PATCH /api/roommates/:id ──────────────────────────────────────────────────
// Authenticated. Owner or admin can update their listing.

exports.updateListing = async (req, res) => {
    try {
        const listing = await RoommateListing.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ message: 'Roommate listing not found' });
        }

        // Only owner or admin can update
        const isOwner = listing.owner && listing.owner.toString() === req.user?._id?.toString();
        const isAdmin = req.user?.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to update this listing' });
        }

        const allowedUpdates = [
            'contact', 'address', 'rentShare', 'utilitiesEstimate',
            'totalBedrooms', 'sizeSqm', 'dateAvailable', 'minLeaseMonths',
            'description', 'images', 'genderPreference', 'lifestyle', 'status',
        ];

        allowedUpdates.forEach((field) => {
            if (req.body[field] !== undefined) {
                listing[field] = req.body[field];
            }
        });

        // Validate images max 3
        if (listing.images && listing.images.length > 3) {
            listing.images = listing.images.slice(0, 3);
        }

        await listing.save();
        return res.json({ success: true, data: listing });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        console.error('[roommateListings] updateListing error:', err);
        return res.status(500).json({ message: 'Failed to update listing' });
    }
};

// ── DELETE /api/roommates/:id ─────────────────────────────────────────────────
// Authenticated. Owner or admin can delete.

exports.deleteListing = async (req, res) => {
    try {
        const listing = await RoommateListing.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ message: 'Roommate listing not found' });
        }

        const isOwner = listing.owner && listing.owner.toString() === req.user?._id?.toString();
        const isAdmin = req.user?.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to delete this listing' });
        }

        await listing.deleteOne();
        return res.json({ success: true, message: 'Listing deleted' });
    } catch (err) {
        console.error('[roommateListings] deleteListing error:', err);
        return res.status(500).json({ message: 'Failed to delete listing' });
    }
};

// ── POST /api/roommates/demand ────────────────────────────────────────────────
// Public. Logs a demand signal when a searcher clicks a roommate listing card.
// Fire-and-forget from the frontend — never blocks UI, never throws to client.

exports.logDemand = async (req, res) => {
    try {
        const { propertyId } = req.body;

        if (propertyId) {
            // Increment click count on the specific listing — non-blocking
            await RoommateListing.findByIdAndUpdate(
                propertyId,
                { $inc: { demandClickCount: 1 } },
                { new: false }
            ).catch(() => {
                // Silently ignore — demand logging is best-effort only
            });
        }

        return res.status(204).send();
    } catch (err) {
        // Always return 204 — demand logging must never surface errors to client
        return res.status(204).send();
    }
};

// ── GET /api/roommates/heatmap ────────────────────────────────────────────────
// Public. Returns aggregated demand data for the map heatmap.
// Groups click counts by neighborhood/city for the Google Maps heatmap layer.

exports.getHeatmap = async (req, res) => {
    try {
        const heatmapData = await RoommateListing.aggregate([
            {
                $match: {
                    status: 'active',
                    expiresAt: { $gt: new Date() },
                    demandClickCount: { $gt: 0 },
                    'address.lat': { $exists: true },
                    'address.lng': { $exists: true },
                },
            },
            {
                $group: {
                    _id: {
                        neighborhood: '$address.neighborhood',
                        city: '$address.city',
                    },
                    lat: { $avg: '$address.lat' },
                    lng: { $avg: '$address.lng' },
                    weight: { $sum: '$demandClickCount' },
                    count: { $sum: 1 },
                },
            },
            { $match: { weight: { $gt: 0 } } },
            { $sort: { weight: -1 } },
            { $limit: 200 },
        ]);

        return res.json({ success: true, data: heatmapData });
    } catch (err) {
        console.error('[roommateListings] getHeatmap error:', err);
        return res.status(500).json({ message: 'Failed to load heatmap data' });
    }
};
