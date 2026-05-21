'use strict';

const mongoose = require('mongoose');
const User = require('../models/User');
const {
    normalizeAlertCriteria,
    normalizeSourceContext,
    normalizeSearchPayload,
    buildSourceSignature,
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

const toValidDateOrFallback = (value, fallbackDate) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallbackDate : parsed;
};

const getTimeOrFallback = (value, fallback = 0) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.getTime();
};

const isDefaultSavedSearchName = (value) => /^saved search \d+$/i.test(normalizeText(value));

const mergeDuplicateSavedSearch = (current, incoming) => {
    const currentUpdatedAt = getTimeOrFallback(current.updatedAt);
    const incomingUpdatedAt = getTimeOrFallback(incoming.updatedAt);
    const currentCreatedAt = getTimeOrFallback(current.createdAt, currentUpdatedAt);
    const incomingCreatedAt = getTimeOrFallback(incoming.createdAt, incomingUpdatedAt);
    const incomingName = normalizeText(incoming.name);
    const currentName = normalizeText(current.name);

    current.enabled = current.enabled !== false || incoming.enabled !== false;
    if (!currentName || (isDefaultSavedSearchName(currentName) && incomingName && !isDefaultSavedSearchName(incomingName))) {
        current.name = incoming.name;
    } else if (incomingUpdatedAt > currentUpdatedAt && incomingName) {
        current.name = incoming.name;
    }

    if (incomingUpdatedAt > currentUpdatedAt) {
        current.criteria = incoming.criteria;
        current.sourceContext = incoming.sourceContext;
        current.sourceSignature = incoming.sourceSignature;
    }

    current.createdAt = new Date(Math.min(currentCreatedAt, incomingCreatedAt));
    current.updatedAt = new Date(Math.max(currentUpdatedAt, incomingUpdatedAt));
};

const sanitizeSavedSearches = (savedSearches = []) => {
    const deduped = [];
    const dedupeIndexBySignature = new Map();

    (Array.isArray(savedSearches) ? savedSearches : [])
        .forEach((search, index) => {
            const fallbackName = `Saved Search ${index + 1}`;
            const criteria = normalizeAlertCriteria(search && search.criteria ? search.criteria : {});
            const sourceContext = normalizeSourceContext(
                search && search.sourceContext ? search.sourceContext : {},
                criteria,
                { includeCapturedAt: false }
            );
            const sourceSignature = normalizeText(search && search.sourceSignature)
                || buildSourceSignature({ criteria, sourceContext });
            const now = new Date();
            const normalized = {
                _id: search && search._id ? search._id : undefined,
                name: normalizeText(search && search.name) || fallbackName,
                enabled: search ? search.enabled !== false : true,
                criteria,
                sourceSignature,
                sourceContext,
                createdAt: toValidDateOrFallback(search && search.createdAt, now),
                updatedAt: toValidDateOrFallback(search && search.updatedAt, now),
            };
            const dedupeKey = sourceSignature || buildSourceSignature({ criteria, sourceContext });
            const existingIndex = dedupeIndexBySignature.get(dedupeKey);
            if (existingIndex == null) {
                dedupeIndexBySignature.set(dedupeKey, deduped.length);
                deduped.push(normalized);
                return;
            }
            mergeDuplicateSavedSearch(deduped[existingIndex], normalized);
        });

    return deduped;
};

const sanitizeInstantAlertsState = (instantAlerts = {}) => {
    const alerts = instantAlerts && typeof instantAlerts === 'object' ? instantAlerts : {};
    return {
        enabled: alerts.enabled === true,
        deliverInApp: alerts.deliverInApp !== false,
        deliverEmail: alerts.deliverEmail === true,
        deliveryPreference: normalizeDeliveryPreference(alerts.deliveryPreference, 'account'),
        savedSearches: sanitizeSavedSearches(alerts.savedSearches),
        inbox: Array.isArray(alerts.inbox) ? alerts.inbox : [],
    };
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
    user.instantAlerts = sanitizeInstantAlertsState(user.instantAlerts);
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
        const searchId = normalizeText(req.query.searchId);
        if (searchId && !mongoose.Types.ObjectId.isValid(searchId)) {
            return res.status(400).json({ success: false, message: 'Invalid search ID' });
        }
        const data = unreadOnly
            ? serialized.inbox.filter((item) => !item.readAt)
            : serialized.inbox;
        const filteredBySearch = searchId
            ? data.filter((item) => String(item.searchId || '') === searchId)
            : data;
        return res.json({
            success: true,
            count: filteredBySearch.length,
            unreadCount: filteredBySearch.filter((item) => !item.readAt).length,
            data: filteredBySearch,
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
