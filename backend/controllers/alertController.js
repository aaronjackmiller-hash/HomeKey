'use strict';

const mongoose = require('mongoose');
const User = require('../models/User');
const {
    normalizeAlertCriteria,
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

const serializeInstantAlerts = (instantAlerts = {}) => {
    const savedSearches = Array.isArray(instantAlerts.savedSearches)
        ? instantAlerts.savedSearches
            .map((search) => ({
                _id: search._id,
                name: search.name,
                enabled: search.enabled !== false,
                criteria: normalizeAlertCriteria(search.criteria || {}),
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
                readAt: item.readAt || null,
                createdAt: item.createdAt || null,
            }))
        : [];

    const unreadCount = inbox.filter((item) => !item.readAt).length;

    return {
        enabled: instantAlerts.enabled === true,
        deliverInApp: instantAlerts.deliverInApp !== false,
        deliverEmail: instantAlerts.deliverEmail === true,
        savedSearches,
        inbox,
        unreadCount,
    };
};

const loadUserAlertsState = async (userId) => {
    const user = await User.findById(userId).select('instantAlerts');
    if (!user) return null;
    if (!user.instantAlerts || typeof user.instantAlerts !== 'object') {
        user.instantAlerts = {
            enabled: false,
            deliverInApp: true,
            deliverEmail: false,
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
        await user.save();
        const serialized = serializeInstantAlerts(user.instantAlerts || {});
        return res.json({
            success: true,
            data: {
                enabled: serialized.enabled,
                deliverInApp: serialized.deliverInApp,
                deliverEmail: serialized.deliverEmail,
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
        const payload = normalizeSearchPayload(req.body, `My Instant Alert ${user.instantAlerts.savedSearches.length + 1}`);
        let targetSearch = null;

        if (searchId) {
            const found = user.instantAlerts.savedSearches.id(searchId);
            if (!found) {
                return res.status(404).json({ success: false, message: 'Alert search not found' });
            }
            found.name = payload.name;
            found.enabled = payload.enabled;
            found.criteria = payload.criteria;
            found.updatedAt = new Date();
            targetSearch = found;
        } else {
            user.instantAlerts.savedSearches.push({
                name: payload.name,
                enabled: payload.enabled,
                criteria: payload.criteria,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            targetSearch = user.instantAlerts.savedSearches[user.instantAlerts.savedSearches.length - 1];
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
