'use strict';

const mongoose = require('mongoose');
const Property = require('../models/Property');
const User = require('../models/User');
const {
    buildManualLifecycleDefaults,
    sendThankYouForListing,
    sendInquiryNotificationToOwner,
    sendShowingRegistrationNotificationToOwner,
} = require('../services/propertyLifecycleService');
const {
    appendSourceIfMissing,
    findDuplicateCandidate,
} = require('../services/propertyMergeService');
const { getRequestUserRole } = require('../utils/authorization');

// Allowed fields for property updates
const PROPERTY_UPDATE_FIELDS = [
    'title', 'description', 'type', 'price', 'address', 'bedrooms', 'bathrooms',
    'size', 'floorNumber', 'buildingDetails', 'financialDetails', 'dates',
    'images', 'agent', 'status', 'contact', 'lifecycle', 'showings',
];

const parsePreferredMethod = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (['email', 'whatsapp', 'phone'].includes(normalized)) return normalized;
    return 'email';
};

const pickFirstNonEmpty = (...values) => {
    for (const value of values) {
        if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    }
    return '';
};

const normalizeOptionalEmail = (...values) => {
    const email = pickFirstNonEmpty(...values);
    return email ? email.toLowerCase() : '';
};

const sanitizeShowings = (showings = []) => {
    if (!Array.isArray(showings)) return [];
    return showings
        .map((showing) => {
            const startsAt = showing?.startsAt ? new Date(showing.startsAt) : null;
            const endsAt = showing?.endsAt ? new Date(showing.endsAt) : null;
            if (!startsAt || !endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
                return null;
            }
            const attendeeLimit = Number(showing.attendeeLimit);
            return {
                startsAt,
                endsAt,
                notes: pickFirstNonEmpty(showing.notes),
                attendeeLimit: Number.isFinite(attendeeLimit) && attendeeLimit > 0 ? Math.floor(attendeeLimit) : 20,
                attendees: [],
            };
        })
        .filter(Boolean);
};

const normalizeManualContact = ({ bodyContact = {}, user }) => {
    const preferredMethod = parsePreferredMethod(
        bodyContact.preferredMethod || user.preferredContactMethod
    );
    return {
        name: pickFirstNonEmpty(bodyContact.name, user.name),
        email: normalizeOptionalEmail(bodyContact.email, user.email),
        phone: pickFirstNonEmpty(bodyContact.phone, user.phone),
        whatsapp: pickFirstNonEmpty(bodyContact.whatsapp, user.whatsapp),
        preferredMethod,
    };
};

const normalizeSourceType = (property) => {
    if (property?.sourceType) return property.sourceType;
    if (property?.externalSource === getLiveYad2SourceTag()) return 'yad2-sync';
    if (property?.externalSource && String(property.externalSource).includes('scrape')) return 'yad2-scrape';
    return 'manual';
};

const sanitizeLifecycleInput = (lifecycle = {}) => {
    const result = {};
    if (Object.prototype.hasOwnProperty.call(lifecycle, 'expiresAt')) {
        const parsed = lifecycle.expiresAt ? new Date(lifecycle.expiresAt) : null;
        if (parsed && !Number.isNaN(parsed.getTime())) {
            result.expiresAt = parsed;
        }
    }
    if (Object.prototype.hasOwnProperty.call(lifecycle, 'autoExpireEnabled')) {
        result.autoExpireEnabled = parseBoolean(lifecycle.autoExpireEnabled, true);
    }
    return result;
};

const parseBoolean = (value, fallback) => {
    if (value == null) return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
};

const isLiveYad2OnlyMode = () => parseBoolean(process.env.LIVE_YAD2_ONLY, process.env.NODE_ENV === 'production');

const getLiveYad2SourceTag = () => {
    const configured = typeof process.env.YAD2_SYNC_SOURCE_TAG === 'string'
        ? process.env.YAD2_SYNC_SOURCE_TAG.trim().toLowerCase()
        : '';
    return configured || 'yad2-live-sync';
};

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public
const getAllProperties = async (req, res) => {
    try {
        const filter = {};

        if (isLiveYad2OnlyMode()) {
            // In live mode, keep synced Yad2 records while still allowing manual listings.
            filter.$or = [
                { externalSource: getLiveYad2SourceTag() },
                { sourceType: 'manual' },
            ];
        }

        // Basic filtering logic
        if (req.query.type) {
            filter.type = req.query.type;
        }
        if (req.query.status) {
            filter.status = req.query.status;
        }
        if (req.query.city) {
            // Escape special regex characters to prevent regex injection
            const escapedCity = req.query.city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter['address.city'] = new RegExp(escapedCity, 'i');
        }
        if (req.query.minPrice || req.query.maxPrice) {
            filter.price = {};
            if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
            if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
        }

        // Mongoose will handle the connection queue automatically
        const properties = await Property.find(filter)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: properties.length,
            data: properties,
        });
    } catch (err) {
        console.error('Property Fetch Error:', err);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: err.message,
        });
    }
};

// @desc    Get a single property by ID
// @route   GET /api/properties/:id
// @access  Public
const getPropertyById = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id).populate('agent', 'name email phone agency');
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }
        res.json({ success: true, data: property });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid property ID' });
        }
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Create a new property
// @route   POST /api/properties
// @access  Private
const createProperty = async (req, res) => {
    try {
        const owner = await User.findById(req.user.id)
            .select('name email phone whatsapp preferredContactMethod role notifications');
        if (!owner) {
            return res.status(401).json({ success: false, message: 'User not found for property creation' });
        }

        const payload = {
            ...req.body,
            sourceType: 'manual',
            owner: owner._id,
            contact: normalizeManualContact({ bodyContact: req.body.contact || {}, user: owner }),
            lifecycle: {
                ...buildManualLifecycleDefaults({ role: owner.role }),
                ...sanitizeLifecycleInput(req.body.lifecycle),
            },
            showings: sanitizeShowings(req.body.showings),
            sources: [
                {
                    sourceType: 'manual',
                    addedAt: new Date(),
                },
            ],
        };

        const duplicate = await findDuplicateCandidate(payload);
        if (duplicate) {
            duplicate.title = payload.title;
            duplicate.description = payload.description || duplicate.description;
            duplicate.type = payload.type;
            duplicate.price = payload.price;
            duplicate.bedrooms = payload.bedrooms;
            duplicate.bathrooms = payload.bathrooms;
            duplicate.size = payload.size;
            duplicate.floorNumber = payload.floorNumber;
            duplicate.address = payload.address;
            duplicate.buildingDetails = payload.buildingDetails;
            duplicate.financialDetails = payload.financialDetails;
            duplicate.dates = payload.dates;
            duplicate.status = payload.status || duplicate.status;
            duplicate.contact = payload.contact;
            duplicate.owner = duplicate.owner || payload.owner;
            duplicate.lifecycle = {
                ...(duplicate.lifecycle || {}),
                ...sanitizeLifecycleInput(payload.lifecycle || {}),
            };
            if (payload.showings.length > 0) {
                duplicate.showings = payload.showings;
            }
            appendSourceIfMissing(duplicate, {
                sourceType: 'manual',
                addedAt: new Date(),
            });
            await duplicate.save();
            await User.updateOne(
                { _id: owner._id },
                { $addToSet: { listings: duplicate._id } }
            );
            await sendThankYouForListing({ user: owner.toObject(), property: duplicate.toObject() });
            return res.status(200).json({
                success: true,
                data: duplicate,
                mergedDuplicate: true,
                message: 'Listing matched an existing property and was merged.',
            });
        }

        const property = await Property.create(payload);
        await User.updateOne(
            { _id: owner._id },
            { $addToSet: { listings: property._id } }
        );
        await sendThankYouForListing({ user: owner.toObject(), property: property.toObject() });
        res.status(201).json({ success: true, data: property });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Update a property
// @route   PUT /api/properties/:id
// @access  Private
const updateProperty = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid property ID' });
    }
    try {
        const updateData = {};
        PROPERTY_UPDATE_FIELDS.forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                updateData[field] = req.body[field];
            }
        });

        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }
        const actingUserRole = await getRequestUserRole(req);
        const isOwner = property.owner && String(property.owner) === String(req.user.id);
        const canManage = isOwner || Boolean(actingUserRole && ['agent', 'admin'].includes(actingUserRole));
        if (!canManage) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this property' });
        }

        Object.assign(property, updateData);
        if (Object.prototype.hasOwnProperty.call(req.body, 'showings')) {
            property.showings = sanitizeShowings(req.body.showings);
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'lifecycle')) {
            property.lifecycle = {
                ...(property.lifecycle || {}),
                ...sanitizeLifecycleInput(req.body.lifecycle || {}),
            };
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'contact')) {
            const owner = await User.findById(property.owner || req.user.id)
                .select('name email phone whatsapp preferredContactMethod')
                .lean();
            if (owner) {
                property.contact = normalizeManualContact({
                    bodyContact: req.body.contact || {},
                    user: owner,
                });
            }
        }
        if (!property.sourceType) {
            property.sourceType = normalizeSourceType(property);
        }
        await property.save();
        res.json({ success: true, data: property });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid property ID' });
        }
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Delete a property
// @route   DELETE /api/properties/:id
// @access  Private
const deleteProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }
        const actingUserRole = await getRequestUserRole(req);
        const isOwner = property.owner && String(property.owner) === String(req.user.id);
        const canManage = isOwner || Boolean(actingUserRole && ['agent', 'admin'].includes(actingUserRole));
        if (!canManage) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this property' });
        }
        await Property.deleteOne({ _id: property._id });
        res.json({ success: true, message: 'Property deleted successfully' });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid property ID' });
        }
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Submit a buyer/renter inquiry to listing owner
// @route   POST /api/properties/:id/inquiries
// @access  Public
const createPropertyInquiry = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }
        const name = pickFirstNonEmpty(req.body.name);
        const message = pickFirstNonEmpty(req.body.message);
        if (!name || !message) {
            return res.status(400).json({ success: false, message: 'Name and message are required.' });
        }

        const inquiry = {
            name,
            message,
            email: normalizeEmail(pickFirstNonEmpty(req.body.email)),
            phone: pickFirstNonEmpty(req.body.phone),
            preferredMethod: parsePreferredMethod(req.body.preferredMethod),
            createdAt: new Date(),
        };
        property.inquiries = [...(property.inquiries || []), inquiry];
        await property.save();
        if (property.owner) {
            const owner = await User.findById(property.owner)
                .select('name email phone whatsapp preferredContactMethod notifications')
                .lean();
            if (owner) {
                await sendInquiryNotificationToOwner({
                    user: owner,
                    property: property.toObject(),
                    inquiry,
                });
            }
        }
        res.status(201).json({ success: true, data: inquiry });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Register attendee for showing
// @route   POST /api/properties/:id/showings/:showingId/attendees
// @access  Public
const registerShowingAttendee = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }
        const showing = property.showings.id(req.params.showingId);
        if (!showing) {
            return res.status(404).json({ success: false, message: 'Showing not found' });
        }
        const name = pickFirstNonEmpty(req.body.name);
        if (!name) {
            return res.status(400).json({ success: false, message: 'Attendee name is required.' });
        }
        if ((showing.attendees || []).length >= (showing.attendeeLimit || 20)) {
            return res.status(400).json({ success: false, message: 'Showing attendee limit reached.' });
        }
        showing.attendees.push({
            name,
            email: normalizeEmail(req.body.email),
            phone: pickFirstNonEmpty(req.body.phone),
            message: pickFirstNonEmpty(req.body.message),
            createdAt: new Date(),
        });
        await property.save();
        if (property.owner) {
            const owner = await User.findById(property.owner)
                .select('name email phone whatsapp preferredContactMethod notifications')
                .lean();
            if (owner) {
                const newAttendee = showing.attendees[showing.attendees.length - 1];
                await sendShowingRegistrationNotificationToOwner({
                    user: owner,
                    property: property.toObject(),
                    showing,
                    attendee: newAttendee,
                });
            }
        }
        res.status(201).json({ success: true, data: showing });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    View full attendees + inquiries for listing owner/agent/admin
// @route   GET /api/properties/:id/engagement
// @access  Private
const getPropertyEngagement = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id)
            .select('owner showings inquiries contact title');
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }
        const actingUserRole = await getRequestUserRole(req);
        const isOwner = property.owner && String(property.owner) === String(req.user.id);
        const canAccess = isOwner || Boolean(actingUserRole && ['agent', 'admin'].includes(actingUserRole));
        if (!canAccess) {
            return res.status(403).json({ success: false, message: 'Not authorized to view engagement data.' });
        }
        return res.json({
            success: true,
            data: {
                propertyId: property._id,
                title: property.title,
                contact: property.contact || {},
                inquiries: property.inquiries || [],
                showings: property.showings || [],
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

module.exports = {
    getAllProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
    createPropertyInquiry,
    registerShowingAttendee,
    getPropertyEngagement,
};
