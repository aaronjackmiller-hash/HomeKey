'use strict';

const User = require('../models/User');

const MAX_ALERTS_PER_USER = 120;

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeBoolean = (value, fallback = false) => {
    if (typeof value === 'boolean') return value;
    if (value == null) return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
};

const toOptionalNumber = (value) => {
    if (value == null || value === '') return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return undefined;
    return parsed;
};

const normalizeRoomsSelection = (value) => {
    const normalized = normalizeText(value).toLowerCase();
    if (!normalized) return '';
    if (normalized === 'studio') return 'studio';
    if (/^\d+\+$/.test(normalized)) return normalized;
    if (/^\d+$/.test(normalized)) return normalized;
    return '';
};

const normalizeBathsSelection = (value) => {
    const normalized = normalizeText(value).toLowerCase();
    if (!normalized) return '';
    if (/^\d+\+$/.test(normalized)) return normalized;
    if (/^\d+$/.test(normalized)) return normalized;
    return '';
};

const normalizeAlertCriteria = (criteria = {}) => {
    const normalized = {};
    const type = normalizeText(criteria.type).toLowerCase();
    if (['sale', 'rental'].includes(type)) {
        normalized.type = type;
    }
    const city = normalizeText(criteria.city);
    if (city) {
        normalized.city = city;
    }
    const minPrice = toOptionalNumber(criteria.minPrice);
    const maxPrice = toOptionalNumber(criteria.maxPrice);
    if (minPrice != null && minPrice >= 0) {
        normalized.minPrice = minPrice;
    }
    if (maxPrice != null && maxPrice >= 0) {
        normalized.maxPrice = maxPrice;
    }
    if (normalized.minPrice != null && normalized.maxPrice != null && normalized.minPrice > normalized.maxPrice) {
        const swappedMin = normalized.maxPrice;
        normalized.maxPrice = normalized.minPrice;
        normalized.minPrice = swappedMin;
    }
    const rooms = normalizeRoomsSelection(criteria.rooms);
    if (rooms) {
        normalized.rooms = rooms;
    }
    const baths = normalizeBathsSelection(criteria.baths);
    if (baths) {
        normalized.baths = baths;
    }
    return normalized;
};

const normalizeSearchPayload = (payload = {}, fallbackName = 'My Instant Alert') => {
    const name = normalizeText(payload.name) || fallbackName;
    return {
        name,
        enabled: normalizeBoolean(payload.enabled, true),
        criteria: normalizeAlertCriteria(payload.criteria || {}),
        updatedAt: new Date(),
    };
};

const toNumericCount = (...values) => {
    for (const value of values) {
        if (value == null || value === '') continue;
        const asNumber = Number(value);
        if (!Number.isNaN(asNumber)) return asNumber;
    }
    return null;
};

const matchesRoomsSelection = (bedroomsValue, roomsSelection) => {
    const selected = normalizeRoomsSelection(roomsSelection);
    if (!selected) return true;
    const bedrooms = Number(bedroomsValue);
    if (Number.isNaN(bedrooms)) return false;
    const EPSILON = 0.001;
    const almostEqual = (left, right) => Math.abs(left - right) < EPSILON;
    if (selected === 'studio') return bedrooms < 1;
    if (selected.endsWith('+')) {
        const minBedrooms = Number(selected.replace('+', ''));
        if (Number.isNaN(minBedrooms)) return true;
        return bedrooms >= minBedrooms;
    }
    const selectedBedrooms = Number(selected);
    if (Number.isNaN(selectedBedrooms)) return true;
    return almostEqual(bedrooms, selectedBedrooms);
};

const matchesBathroomsSelection = (bathroomsValue, bathroomsSelection) => {
    const selected = normalizeBathsSelection(bathroomsSelection);
    if (!selected) return true;
    const bathrooms = Number(bathroomsValue);
    if (Number.isNaN(bathrooms)) return false;
    const EPSILON = 0.001;
    const almostEqual = (left, right) => Math.abs(left - right) < EPSILON;
    if (selected.endsWith('+')) {
        const minBathrooms = Number(selected.replace('+', ''));
        if (Number.isNaN(minBathrooms)) return true;
        return bathrooms >= minBathrooms;
    }
    const selectedBathrooms = Number(selected);
    if (Number.isNaN(selectedBathrooms)) return true;
    return almostEqual(bathrooms, selectedBathrooms);
};

const propertyMatchesCriteria = (property, criteria = {}) => {
    if (!property || typeof property !== 'object') return false;
    const normalizedCriteria = normalizeAlertCriteria(criteria);
    const propertyType = normalizeText(property.type).toLowerCase();
    const propertyCity = normalizeText(property.address && property.address.city).toLowerCase();
    const propertyPrice = Number(property.price);
    const bedrooms = toNumericCount(property.bedrooms, property.rooms, property.roomCount);
    const bathrooms = toNumericCount(
        property.bathrooms,
        property.baths,
        property.bathroomCount,
        property.numberOfBathrooms
    );

    if (normalizedCriteria.type && propertyType !== normalizedCriteria.type) return false;
    if (normalizedCriteria.city && !propertyCity.includes(normalizedCriteria.city.toLowerCase())) return false;
    if (normalizedCriteria.minPrice != null && Number.isFinite(propertyPrice) && propertyPrice < normalizedCriteria.minPrice) return false;
    if (normalizedCriteria.maxPrice != null && Number.isFinite(propertyPrice) && propertyPrice > normalizedCriteria.maxPrice) return false;
    if (!matchesRoomsSelection(bedrooms, normalizedCriteria.rooms)) return false;
    if (!matchesBathroomsSelection(bathrooms, normalizedCriteria.baths)) return false;
    return true;
};

const buildPropertySnapshot = (property = {}) => ({
    title: normalizeText(property.title),
    type: normalizeText(property.type),
    city: normalizeText(property.address && property.address.city),
    price: Number.isFinite(Number(property.price)) ? Number(property.price) : undefined,
    bedrooms: Number.isFinite(Number(property.bedrooms)) ? Number(property.bedrooms) : undefined,
    bathrooms: Number.isFinite(Number(property.bathrooms)) ? Number(property.bathrooms) : undefined,
    image: Array.isArray(property.images) && property.images.length > 0 ? normalizeText(property.images[0]) : '',
    createdAt: property.createdAt ? new Date(property.createdAt) : new Date(),
});

const makeAlertMessage = (property = {}, search = {}) => {
    const title = normalizeText(property.title) || 'A new listing';
    const city = normalizeText(property.address && property.address.city);
    const searchName = normalizeText(search.name) || 'your instant alert';
    const titleLower = title.toLowerCase();
    const cityLower = city.toLowerCase();
    if (city && !titleLower.includes(cityLower)) {
        return `${title} in ${city} matches ${searchName}.`;
    }
    return `${title} matches ${searchName}.`;
};

const queueInstantAlertsForProperties = async (propertiesInput = []) => {
    const incoming = Array.isArray(propertiesInput) ? propertiesInput : [propertiesInput];
    const properties = incoming.filter((item) => item && item._id && normalizeText(item.status || 'active') !== 'inactive');
    if (properties.length === 0) {
        return { usersNotified: 0, alertsCreated: 0 };
    }

    const users = await User.find({
        'instantAlerts.enabled': true,
        'instantAlerts.deliverInApp': true,
        'instantAlerts.savedSearches.enabled': true,
    }).select('_id instantAlerts').lean();

    if (!Array.isArray(users) || users.length === 0) {
        return { usersNotified: 0, alertsCreated: 0 };
    }

    let usersNotified = 0;
    let alertsCreated = 0;

    for (const user of users) {
        const savedSearches = Array.isArray(user.instantAlerts && user.instantAlerts.savedSearches)
            ? user.instantAlerts.savedSearches.filter((search) => search && search.enabled !== false)
            : [];
        if (savedSearches.length === 0) continue;

        const existingInbox = Array.isArray(user.instantAlerts && user.instantAlerts.inbox)
            ? user.instantAlerts.inbox
            : [];
        const existingKeys = new Set(
            existingInbox
                .map((item) => {
                    if (!item || !item.propertyId || !item.searchId) return '';
                    return `${String(item.propertyId)}::${String(item.searchId)}`;
                })
                .filter(Boolean)
        );

        const newAlerts = [];
        for (const property of properties) {
            for (const search of savedSearches) {
                const searchId = String(search._id || '');
                if (!searchId) continue;
                if (!propertyMatchesCriteria(property, search.criteria || {})) continue;
                const dedupeKey = `${String(property._id)}::${searchId}`;
                if (existingKeys.has(dedupeKey)) continue;
                existingKeys.add(dedupeKey);
                newAlerts.push({
                    searchId: search._id,
                    searchName: normalizeText(search.name) || 'My Instant Alert',
                    propertyId: property._id,
                    propertySnapshot: buildPropertySnapshot(property),
                    message: makeAlertMessage(property, search),
                    createdAt: new Date(),
                });
            }
        }

        if (newAlerts.length === 0) continue;

        await User.updateOne(
            { _id: user._id },
            {
                $push: {
                    'instantAlerts.inbox': {
                        $each: newAlerts,
                        $slice: -MAX_ALERTS_PER_USER,
                    },
                },
            }
        );

        usersNotified += 1;
        alertsCreated += newAlerts.length;
    }

    return { usersNotified, alertsCreated };
};

module.exports = {
    normalizeAlertCriteria,
    normalizeSearchPayload,
    queueInstantAlertsForProperties,
};
