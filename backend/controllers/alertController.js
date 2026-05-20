'use strict';

const mongoose = require('mongoose');
const User = require('../models/User');
const {
    normalizeAlertCriteria,
    normalizeSourceContext,
    normalizeSearchPayload,
} = require('../services/instantAlertService');

const normalizeBoolean = (value, fallback = false) => {
    if (typeof value === 'boolean') return value;
    if (value == null) return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
};

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeDeliveryPreference = (value, fallback = 'account') => {
    const normalized = normalizeText(value).toLowerCase();
    if (['account', 'email', 'whatsapp'].includes(normalized)) return normalized;
    return fallback;
};

const serializeInstantAlerts = (instantAlerts = {}) => {
    const savedSearches = Array.isArray(instantAlerts.savedSearches)
        ? instantAlerts.savedSearches
            .map((search) => ({
                _id: search._id,
                name: search.name,
                enabled: search.enabled !== false,
                criteria: normalizeAlertCriteria(search.criteria || {}),
                sourceSignature: normalizeText(search.sourceSignature),
                sourceContext: normalizeSourceContext(search.sourceContext || {}, search.criteria || {}, { includeCapturedAt: false }),
                createdAt: search.createdAt || null,
                updatedAt: search.updatedAt || null,
            }))
            .sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime())
        : [];

    const inbox = Array.isArray(instantAlerts.inbox)
        ? [...instantAlerts.inbox]
            .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
            .map((item) => ({
                _id: item._id,
                searchId: item.searchId || null,
                searchName: item.searchName || '',
                propertyId: item.propertyId,
                propertySnapshot: item.propertySnapshot || {},
                message: item.message || '',
                deliveryChannel: item.deliveryChannel || 'in-app',
                deliveryTarget: item.deliveryTarget || '',
                readAt: item.readAt || null,
                createdAt: item.createdAt || null,
            }))
        : [];

    const unreadCount = inbox.filter((item) => !item.readAt).length;

    return {
        enabled: instantAlerts.enabled === true,
        deliverInApp: instantAlerts.deliverInApp !== false,
        deliverEmail: instantAlerts.deliverEmail === true,
        deliveryPreference: normalizeDeliveryPreference(instantAlerts.deliveryPreference, 'account'),
        savedSearches,
        inbox,
        unreadCount,
    };
};

const loadUserAlertsState = async (userId) => {
    const user = await User.findById(userId).select('instantAlerts preferredContactMethod');
    if (!user) return null;
    if (!user.instantAlerts || typeof user.instantAlerts !== 'object') {
        user.instantAlerts = {
            enabled: false,
            deliverInApp: true,
            deliverEmail: false,
            deliveryPreference: 'account',
            savedSearches: [],
            inbox: [],
        };
    }
    return user;
};

// @desc    Get current user's alert preferences + inbox
// @route   GET /api/alerts
// @access  Private
const getMyInstantAlerts = async (req, res) => {
    try {
        const user = await loadUserAlertsState(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const serialized = serializeInstantAlerts(user.instantAlerts || {});
        return res.json({
            success: true,
            data: {
                enabled: serialized.enabled,
                deliverInApp: serialized.deliverInApp,
                deliverEmail: serialized.deliverEmail,
                deliveryPreference: serialized.deliveryPreference,
                accountPreferredContactMethod: normalizeText(user.preferredContactMethod).toLowerCase() || 'email',
                savedSearches: serialized.savedSearches,
                unreadCount: serialized.unreadCount,
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Update current user's global alert settings
// @route   PUT /api/alerts/settings
// @access  Private
const updateMyInstantAlertSettings = async (req, res) => {
    try {
        const user = await loadUserAlertsState(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        user.instantAlerts.enabled = normalizeBoolean(req.body.enabled, user.instantAlerts.enabled === true);
        user.instantAlerts.deliverInApp = normalizeBoolean(req.body.deliverInApp, user.instantAlerts.deliverInApp !== false);
        user.instantAlerts.deliverEmail = normalizeBoolean(req.body.deliverEmail, user.instantAlerts.deliverEmail === true);
        user.instantAlerts.deliveryPreference = normalizeDeliveryPreference(
            req.body.deliveryPreference,
            normalizeDeliveryPreference(user.instantAlerts.deliveryPreference, 'account')
        );
        await user.save();
        const serialized = serializeInstantAlerts(user.instantAlerts || {});
        return res.json({
            success: true,
            data: {
                enabled: serialized.enabled,
                deliverInApp: serialized.deliverInApp,
                deliverEmail: serialized.deliverEmail,
                deliveryPreference: serialized.deliveryPreference,
                accountPreferredContactMethod: normalizeText(user.preferredContactMethod).toLowerCase() || 'email',
                savedSearches: serialized.savedSearches,
                unreadCount: serialized.unreadCount,
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Create or update one instant alert search
// @route   POST /api/alerts/searches
// @access  Private
const upsertMyInstantAlertSearch = async (req, res) => {
    try {
        const user = await loadUserAlertsState(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (!Array.isArray(user.instantAlerts.savedSearches)) {
            user.instantAlerts.savedSearches = [];
        }

        const searchId = String(req.body.searchId || '').trim();
        const payload = normalizeSearchPayload(req.body, `Saved Search ${user.instantAlerts.savedSearches.length + 1}`);
        let targetSearch = null;
        const explicitName = normalizeText(req.body.name);

        if (searchId) {
            const found = user.instantAlerts.savedSearches.id(searchId);
            if (!found) {
                return res.status(404).json({ success: false, message: 'Alert search not found' });
            }
            found.name = payload.name;
            found.enabled = payload.enabled;
            found.criteria = payload.criteria;
            found.sourceSignature = payload.sourceSignature;
            found.sourceContext = payload.sourceContext;
            found.updatedAt = new Date();
            targetSearch = found;
        } else {
            const existingBySignature = normalizeText(payload.sourceSignature)
                ? user.instantAlerts.savedSearches.find(
                    (savedSearch) => normalizeText(savedSearch.sourceSignature) === normalizeText(payload.sourceSignature)
                )
                : null;
            if (existingBySignature) {
                if (explicitName) {
                    existingBySignature.name = payload.name;
                }
                existingBySignature.enabled = payload.enabled;
                existingBySignature.criteria = payload.criteria;
                existingBySignature.sourceSignature = payload.sourceSignature;
                existingBySignature.sourceContext = payload.sourceContext;
                existingBySignature.updatedAt = new Date();
                targetSearch = existingBySignature;
            } else {
                user.instantAlerts.savedSearches.push({
                    name: payload.name,
                    enabled: payload.enabled,
                    criteria: payload.criteria,
                    sourceSignature: payload.sourceSignature,
                    sourceContext: payload.sourceContext,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                targetSearch = user.instantAlerts.savedSearches[user.instantAlerts.savedSearches.length - 1];
            }
        }

        await user.save();
        return res.json({
            success: true,
            data: {
                search: {
                    _id: targetSearch._id,
                    name: targetSearch.name,
                    enabled: targetSearch.enabled !== false,
                    criteria: normalizeAlertCriteria(targetSearch.criteria || {}),
                    sourceSignature: normalizeText(targetSearch.sourceSignature),
                    sourceContext: normalizeSourceContext(
                        targetSearch.sourceContext || {},
                        targetSearch.criteria || {},
                        { includeCapturedAt: false }
                    ),
                    createdAt: targetSearch.createdAt || null,
                    updatedAt: targetSearch.updatedAt || null,
                },
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Delete one instant alert search
// @route   DELETE /api/alerts/searches/:searchId
// @access  Private
const deleteMyInstantAlertSearch = async (req, res) => {
    try {
        const user = await loadUserAlertsState(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const searchId = String(req.params.searchId || '').trim();
        if (!searchId || !mongoose.Types.ObjectId.isValid(searchId)) {
            return res.status(400).json({ success: false, message: 'Invalid search ID' });
        }
        const searchDoc = user.instantAlerts.savedSearches.id(searchId);
        if (!searchDoc) {
            return res.status(404).json({ success: false, message: 'Alert search not found' });
        }
        searchDoc.deleteOne();
        await user.save();
        return res.json({ success: true, message: 'Alert search deleted' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Get current user's alert inbox
// @route   GET /api/alerts/inbox
// @access  Private
const getMyInstantAlertInbox = async (req, res) => {
    try {
        const user = await loadUserAlertsState(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const serialized = serializeInstantAlerts(user.instantAlerts || {});
        const unreadOnly = normalizeBoolean(req.query.unreadOnly, false);
        const data = unreadOnly
            ? serialized.inbox.filter((item) => !item.readAt)
            : serialized.inbox;
        return res.json({
            success: true,
            count: data.length,
            unreadCount: serialized.unreadCount,
            data,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Mark one alert inbox item read/unread
// @route   PUT /api/alerts/inbox/:alertId/read
// @access  Private
const markMyInstantAlertReadState = async (req, res) => {
    try {
        const user = await loadUserAlertsState(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const alertId = String(req.params.alertId || '').trim();
        if (!alertId || !mongoose.Types.ObjectId.isValid(alertId)) {
            return res.status(400).json({ success: false, message: 'Invalid alert ID' });
        }
        const alertDoc = user.instantAlerts.inbox.id(alertId);
        if (!alertDoc) {
            return res.status(404).json({ success: false, message: 'Alert not found' });
        }
        const markRead = normalizeBoolean(req.body.read, true);
        alertDoc.readAt = markRead ? new Date() : null;
        await user.save();
        return res.json({
            success: true,
            data: {
                _id: alertDoc._id,
                readAt: alertDoc.readAt || null,
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

module.exports = {
    getMyInstantAlerts,
    updateMyInstantAlertSettings,
    upsertMyInstantAlertSearch,
    deleteMyInstantAlertSearch,
    getMyInstantAlertInbox,
    markMyInstantAlertReadState,
};
