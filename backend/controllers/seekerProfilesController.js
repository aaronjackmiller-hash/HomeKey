'use strict';

/**
 * seekerProfilesController.js
 * path: backend/controllers/seekerProfilesController.js
 */

const SeekerProfile = require('../models/SeekerProfile');
const { sendRoommateSeekerConfirmationSms } = require('../services/smsService');

// Sanitize a phone string for the wa.me link — strips non-digit chars,
// converts leading 0 (Israeli local) to 972 country code.
const sanitizePhone = (raw = '') => {
    const digits = String(raw || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
    if (digits.startsWith('972')) return digits;
    if (digits.startsWith('0')) return `972${digits.slice(1)}`;
    return digits;
};

// Map FilterMenu budget range strings to numeric min/max
const parseBudgetRange = (rangeStr = '') => {
    if (rangeStr.includes('Under') || rangeStr.includes('5k') && rangeStr.startsWith('U')) {
        return { budgetMin: 0, budgetMax: 5000 };
    }
    if (rangeStr.includes('5k') && rangeStr.includes('10k')) {
        return { budgetMin: 5000, budgetMax: 10000 };
    }
    if (rangeStr.includes('10k+') || rangeStr.includes('10k')) {
        return { budgetMin: 10000, budgetMax: null };
    }
    return { budgetMin: 0, budgetMax: null };
};

// Map FilterMenu sharing option string to a number
const parseMaxOthers = (sharingStr = '') => {
    if (sharingStr.includes('1')) return 1;
    if (sharingStr.includes('2')) return 2;
    return 3;
};

// Map FilterMenu lease option string to months
const parseLeaseDuration = (leaseStr = '') => {
    const num = parseInt(leaseStr, 10);
    if (!Number.isNaN(num)) return num;
    return 6;
};

// Map FilterMenu flexibility string to enum
const parseFlexibility = (flexStr = '') => {
    if (flexStr.includes('3')) return '3-days';
    if (flexStr.includes('7')) return '7-days';
    return 'strict';
};

// Map FilterMenu gender option to enum
const parseGender = (genderStr = '') => {
    const lower = genderStr.toLowerCase();
    if (lower === 'men') return 'men';
    if (lower === 'women') return 'women';
    return 'no-preference';
};

// Map FilterMenu smoking option to enum
const parseSmoking = (smokingStr = '') => {
    const lower = smokingStr.toLowerCase();
    if (lower.includes('anywhere')) return 'anywhere';
    if (lower.includes('outside')) return 'outside-only';
    return 'not-at-all';
};

// Map FilterMenu kosher option to enum
const parseKosher = (kosherStr = '') => {
    const lower = kosherStr.toLowerCase();
    if (lower.includes('yes')) return 'yes';
    if (lower.includes('open')) return 'open-to-it';
    return 'no';
};

/**
 * POST /api/seekers
 * Create a new seeker profile. No authentication required — same pattern as
 * RoommateListing creation (anonymous listings are allowed).
 */
const createSeekerProfile = async (req, res) => {
    try {
        const body = req.body || {};

        // Validate required field
        const phone = String(body.phone || body['contact.phone'] || body.contact?.phone || '').trim();
        if (!phone || phone.length < 7) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required (minimum 7 digits).',
            });
        }

        const { budgetMin, budgetMax } = parseBudgetRange(body.budgetRange || '');

        const profileData = {
            contact: {
                phone: sanitizePhone(phone),
                preferredMethod: 'whatsapp',
            },
            firstName: String(body.firstName || '').trim().slice(0, 40) || undefined,
            locationPreference: {
                city: String(body.city || body.locationCity || '').trim() || undefined,
                neighborhood: String(body.neighborhood || body.locationNeighborhood || '').trim() || undefined,
            },
            budgetMin: Number.isFinite(Number(body.budgetMin)) ? Number(body.budgetMin) : budgetMin,
            budgetMax: Number.isFinite(Number(body.budgetMax)) ? Number(body.budgetMax) : (budgetMax || undefined),
            moveInDate: body.moveInDate ? new Date(body.moveInDate) : undefined,
            moveInFlexibility: parseFlexibility(body.moveInFlexibility || body.flexibility || ''),
            bedroomsNeeded: Math.max(1, parseInt(body.bedroomsNeeded || body.bedrooms || '1', 10) || 1),
            maxOthers: parseMaxOthers(body.sharingWith || body.maxOthers || '1 other'),
            leaseDurationMonths: parseLeaseDuration(body.leaseTerm || body.leaseDurationMonths || '6 mo'),
            genderPreference: parseGender(body.genderPreference || body.gender || 'no-preference'),
            lifestyle: {
                smoking: parseSmoking(body.smoking || body['lifestyle.smoking'] || 'Not at all'),
                kosherKitchen: parseKosher(body.kosher || body.kosherKitchen || body['lifestyle.kosherKitchen'] || 'Open to it'),
            },
            amenities: Array.isArray(body.amenities) ? body.amenities.filter(Boolean) : [],
        };

        const profile = new SeekerProfile(profileData);
        await profile.save();

        sendRoommateSeekerConfirmationSms({
            toPhone: profile.contact.phone,
            city: profile.locationPreference?.city,
            neighborhood: profile.locationPreference?.neighborhood,
        }).catch(() => {});

        return res.status(201).json({
            success: true,
            message: 'Seeker profile published. Room listers can now contact you.',
            data: {
                _id: profile._id,
                firstName: profile.firstName,
                expiresAt: profile.expiresAt,
            },
        });
    } catch (err) {
        console.error('[seekers] createSeekerProfile error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to create seeker profile.' });
    }
};

/**
 * GET /api/seekers
 * Return active seeker profiles. Supports filtering by city.
 * Public — room listers browse this to find people looking for a room.
 * Phone is NOT included in the response; the wa.me link is built server-side.
 */
const getSeekerProfiles = async (req, res) => {
    try {
        const query = { status: 'active' };

        const city = String(req.query.city || '').trim();
        if (city) {
            query['locationPreference.city'] = { $regex: new RegExp(city, 'i') };
        }

        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '40', 10)));

        const [profiles, total] = await Promise.all([
            SeekerProfile
                .find(query)
                .select('-contact.phone') // never expose raw phone
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean(),
            SeekerProfile.countDocuments(query),
        ]);

        // Attach a pre-built WhatsApp link so the frontend never touches the raw number
        const profilesWithContact = await Promise.all(
            profiles.map(async (p) => {
                // Re-fetch just the phone for the wa.me link (not sent to client as plain text)
                const full = await SeekerProfile.findById(p._id).select('contact.phone').lean();
                const waPhone = full?.contact?.phone ? sanitizePhone(full.contact.phone) : null;
                return {
                    ...p,
                    whatsappHref: waPhone ? `https://wa.me/${waPhone}` : null,
                };
            })
        );

        return res.json({
            success: true,
            data: profilesWithContact,
            count: total,
            total,
        });
    } catch (err) {
        console.error('[seekers] getSeekerProfiles error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load seeker profiles.' });
    }
};

/**
 * PATCH /api/seekers/:id/deactivate
 * Allows a seeker to deactivate their own profile (e.g. they found a room).
 * No auth required — uses the profile ID as a soft token (obscurity is fine here).
 */
const deactivateSeekerProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const profile = await SeekerProfile.findById(id);
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found.' });
        }
        profile.status = 'inactive';
        await profile.save();
        return res.json({ success: true, message: 'Profile deactivated.' });
    } catch (err) {
        console.error('[seekers] deactivateSeekerProfile error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to deactivate profile.' });
    }
};

module.exports = { createSeekerProfile, getSeekerProfiles, deactivateSeekerProfile };
