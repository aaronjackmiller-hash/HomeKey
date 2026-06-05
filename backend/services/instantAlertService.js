'use strict';

const User = require('../models/User');

const MAX_ALERTS_PER_USER = 120;
const PROPERTY_CATEGORY_OPTIONS = new Set(['apartments', 'houses']);
const FEATURE_FILTER_OPTIONS = new Set([
    'elevator',
    'parking',
    'pets',
    'disabled-access',
    'renovated',
    'furnished',
    'mamad',
]);
const PROPERTY_CATEGORY_KEYWORDS = {
    apartments: ['apartment', 'studio', 'penthouse', 'flat', 'condo', 'דירה', 'פנטהאוז', 'סטודיו'],
    houses: ['house', 'villa', 'duplex', 'townhouse', 'cottage', 'home', 'בית', 'וילה', 'קוטג'],
};

const DEFAULT_ALERT_SEARCH_NAME = 'My Alerts';
const FEATURE_KEYWORDS = {
    elevator: ['elevator', 'lift', 'מעלית'],
    parking: ['parking', 'garage', 'carport', 'חניה', 'חניון'],
    pets: ['pets', 'pet friendly', 'dog', 'cat', 'חיות מחמד'],
    'disabled-access': ['accessible', 'wheelchair', 'disabled', 'נגיש', 'נכים'],
    renovated: ['renovated', 'newly renovated', 'refurbished', 'משופץ'],
    furnished: ['furnished', 'fully furnished', 'מרוהט'],
    mamad: ['mamad', 'security room', 'safe room', 'ממד', 'ממ״ד'],
};

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

const normalizeStringArray = (value, { allowEmpty = false } = {}) => {
    if (!Array.isArray(value)) return [];
    const unique = new Set();
    const normalized = [];
    for (const entry of value) {
        const text = normalizeText(entry);
        if (!allowEmpty && !text) continue;
        const key = text.toLowerCase();
        if (unique.has(key)) continue;
        unique.add(key);
        normalized.push(text);
    }
    return normalized;
};

const normalizeCoordinate = (value) => {
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

const normalizeCircleCriteria = (circle = {}) => {
    if (!circle || typeof circle !== 'object') return undefined;
    const lat = normalizeCoordinate(circle.center && circle.center.lat);
    const lng = normalizeCoordinate(circle.center && circle.center.lng);
    const radiusMeters = toOptionalNumber(circle.radiusMeters);
    if (lat == null || lng == null || radiusMeters == null || radiusMeters <= 0) return undefined;
    return {
        center: { lat, lng },
        radiusMeters,
    };
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
    const searchText = normalizeText(criteria.searchText);
    if (searchText) {
        normalized.searchText = searchText;
    }
    const cityHints = normalizeStringArray(criteria.cityHints);
    if (cityHints.length > 0) {
        normalized.cityHints = cityHints;
    }
    const circle = normalizeCircleCriteria(criteria.circle);
    if (circle) {
        normalized.circle = circle;
    }
    return normalized;
};

const normalizeSourceContext = (sourceContext = {}, criteria = {}, options = {}) => {
    const { includeCapturedAt = true } = options;
    const context = sourceContext && typeof sourceContext === 'object' ? sourceContext : {};
    const normalized = {};

    const searchText = normalizeText(context.searchText || criteria.searchText);
    if (searchText) normalized.searchText = searchText;

    const propertyCategory = normalizeText(context.propertyCategory).toLowerCase();
    if (PROPERTY_CATEGORY_OPTIONS.has(propertyCategory)) {
        normalized.propertyCategory = propertyCategory;
    }

    const featureFilters = normalizeStringArray(context.featureFilters)
        .map((feature) => feature.toLowerCase())
        .filter((feature) => FEATURE_FILTER_OPTIONS.has(feature));
    if (featureFilters.length > 0) {
        normalized.featureFilters = featureFilters;
    }

    normalized.likedOnly = normalizeBoolean(context.likedOnly, false);
    const criteriaCircle = criteria.circle && typeof criteria.circle === 'object' ? criteria.circle : {};
    const mergedCircle = {
        ...(context.circle && typeof context.circle === 'object' ? context.circle : {}),
        ...(criteriaCircle || {}),
    };
    const circle = normalizeCircleCriteria(mergedCircle);
    const circleCityHints = normalizeStringArray(
        (context.circle && context.circle.cityHints) || criteria.cityHints || []
    );
    if (circle || circleCityHints.length > 0) {
        normalized.circle = {};
        if (circle) {
            normalized.circle.center = circle.center;
            normalized.circle.radiusMeters = circle.radiusMeters;
        }
        if (circleCityHints.length > 0) {
            normalized.circle.cityHints = circleCityHints;
        }
    }
    if (includeCapturedAt) {
        normalized.capturedAt = new Date();
    } else if (context.capturedAt) {
        const parsedCapturedAt = new Date(context.capturedAt);
        if (!Number.isNaN(parsedCapturedAt.getTime())) {
            normalized.capturedAt = parsedCapturedAt;
        }
    }
    return normalized;
};

const buildSourceSignature = ({ criteria = {}, sourceContext = {} }) => {
    const signatureObject = {
        type: criteria.type || '',
        city: criteria.city || '',
        minPrice: criteria.minPrice != null ? Number(criteria.minPrice) : null,
        maxPrice: criteria.maxPrice != null ? Number(criteria.maxPrice) : null,
        rooms: criteria.rooms || '',
        baths: criteria.baths || '',
        searchText: criteria.searchText || sourceContext.searchText || '',
        cityHints: normalizeStringArray(criteria.cityHints || (sourceContext.circle && sourceContext.circle.cityHints) || [])
            .map((item) => item.toLowerCase()),
        circle: criteria.circle && criteria.circle.center && criteria.circle.radiusMeters
            ? {
                lat: Number(criteria.circle.center.lat),
                lng: Number(criteria.circle.center.lng),
                radiusMeters: Number(criteria.circle.radiusMeters),
            }
            : null,
        propertyCategory: sourceContext.propertyCategory || '',
        featureFilters: normalizeStringArray(sourceContext.featureFilters || [])
            .map((item) => item.toLowerCase())
            .sort(),
        likedOnly: Boolean(sourceContext.likedOnly),
    };
    return JSON.stringify(signatureObject);
};

const makeDefaultSearchName = ({ criteria = {}, sourceContext = {}, fallbackName = DEFAULT_ALERT_SEARCH_NAME }) => {
    const typeLabel = criteria.type === 'sale'
        ? 'Sale'
        : criteria.type === 'rental'
            ? 'Rental'
            : '';
    const localityLabel = criteria.city
        || (sourceContext.circle && Array.isArray(sourceContext.circle.cityHints) && sourceContext.circle.cityHints[0])
        || criteria.searchText
        || sourceContext.searchText
        || '';
    const maxLabel = Number.isFinite(Number(criteria.maxPrice))
        ? `Under ₪${Number(criteria.maxPrice).toLocaleString()}`
        : '';
    const parts = [localityLabel, typeLabel, maxLabel].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : fallbackName;
};

const normalizeSearchPayload = (payload = {}, fallbackName = DEFAULT_ALERT_SEARCH_NAME) => {
    const criteria = normalizeAlertCriteria(payload.criteria || {});
    const sourceContext = normalizeSourceContext(payload.sourceContext || {}, criteria);
    const fallbackSearchName = makeDefaultSearchName({
        criteria,
        sourceContext,
        fallbackName: fallbackName || DEFAULT_ALERT_SEARCH_NAME,
    });
    const name = normalizeText(payload.name) || fallbackSearchName;
    return {
        name,
        enabled: normalizeBoolean(payload.enabled, true),
        criteria,
        sourceContext,
        sourceSignature: buildSourceSignature({ criteria, sourceContext }),
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

const buildPropertySearchText = (property = {}) => {
    const values = [
        property.title,
        property.description,
        property.featuresText,
        property.externalSource,
        property.status,
        property.address && property.address.street,
        property.address && property.address.streetNumber,
        property.address && property.address.city,
        property.buildingDetails && property.buildingDetails.name,
        property.contact && property.contact.agency,
        property.details && property.details.amenities,
        property.details && property.details.features,
        property.buildingDetails && property.buildingDetails.amenities,
        property.amenities,
        property.features,
    ];
    return values
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
};

const includesAnyKeyword = (searchText = '', keywords = []) =>
    keywords.some((keyword) => searchText.includes(String(keyword || '').toLowerCase()));

const matchesPropertyCategory = (property = {}, selectedCategory = '') => {
    const category = String(selectedCategory || '').trim().toLowerCase();
    if (!category) return true;
    const keywords = PROPERTY_CATEGORY_KEYWORDS[category];
    if (!keywords || keywords.length === 0) return true;
    return includesAnyKeyword(buildPropertySearchText(property), keywords);
};

const matchesSelectedFeatures = (property = {}, selectedFeatures = []) => {
    const normalizedFeatures = Array.isArray(selectedFeatures) ? selectedFeatures : [];
    if (normalizedFeatures.length === 0) return true;
    const searchText = buildPropertySearchText(property);
    return normalizedFeatures.every((feature) => {
        const keywords = FEATURE_KEYWORDS[String(feature || '').trim().toLowerCase()] || [];
        if (keywords.length === 0) return true;
        return includesAnyKeyword(searchText, keywords);
    });
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

const propertyMatchesCriteria = (property, criteria = {}, sourceContext = {}) => {
    if (!property || typeof property !== 'object') return false;
    const normalizedCriteria = normalizeAlertCriteria(criteria);
    const normalizedSourceContext = normalizeSourceContext(sourceContext, normalizedCriteria, { includeCapturedAt: false });
    const propertyType = normalizeText(property.type).toLowerCase();
    const propertyCity = normalizeText(property.address && property.address.city).toLowerCase();
    const propertyStreet = normalizeText(property.address && property.address.street).toLowerCase();
    const propertyTitle = normalizeText(property.title).toLowerCase();
    const propertyDescription = normalizeText(property.description).toLowerCase();
    const propertySearchText = [propertyTitle, propertyDescription, propertyStreet, propertyCity].filter(Boolean).join(' ');
    const propertyPrice = Number(property.price);
    const bedrooms = toNumericCount(property.bedrooms, property.rooms, property.roomCount);
    const bathrooms = toNumericCount(
        property.bathrooms,
        property.baths,
        property.bathroomCount,
        property.numberOfBathrooms
    );

    if (normalizedCriteria.type && propertyType !== normalizedCriteria.type) return false;
    if (
        normalizedCriteria.city
        && !propertyCity.includes(normalizedCriteria.city.toLowerCase())
        && !propertySearchText.includes(normalizedCriteria.city.toLowerCase())
    ) return false;
    if (normalizedCriteria.searchText && !propertySearchText.includes(normalizedCriteria.searchText.toLowerCase())) return false;
    if (Array.isArray(normalizedCriteria.cityHints) && normalizedCriteria.cityHints.length > 0) {
        const matchesCityHint = normalizedCriteria.cityHints.some((cityHint) => {
            const normalizedHint = normalizeText(cityHint).toLowerCase();
            if (!normalizedHint) return false;
            return propertyCity.includes(normalizedHint) || propertySearchText.includes(normalizedHint);
        });
        if (!matchesCityHint) return false;
    }
    if (!matchesPropertyCategory(property, normalizedSourceContext.propertyCategory)) return false;
    if (!matchesSelectedFeatures(property, normalizedSourceContext.featureFilters || [])) return false;
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

const resolveDeliveryChannel = (user = {}) => {
    const alerts = user.instantAlerts && typeof user.instantAlerts === 'object' ? user.instantAlerts : {};
    const explicitPreference = normalizeText(alerts.deliveryPreference).toLowerCase();
    const accountPreference = normalizeText(user.preferredContactMethod).toLowerCase();
    let channel = explicitPreference === 'email' || explicitPreference === 'whatsapp'
        ? explicitPreference
        : accountPreference;
    if (channel === 'phone') channel = 'whatsapp';
    if (channel !== 'email' && channel !== 'whatsapp') channel = 'email';

    const emailTarget = normalizeText(user.email);
    const whatsappTarget = normalizeText(user.whatsapp || user.phone);

    if (channel === 'whatsapp' && whatsappTarget) {
        return { channel: 'whatsapp', target: whatsappTarget };
    }
    if (channel === 'email' && emailTarget) {
        return { channel: 'email', target: emailTarget };
    }
    if (emailTarget) return { channel: 'email', target: emailTarget };
    if (whatsappTarget) return { channel: 'whatsapp', target: whatsappTarget };
    return null;
};

const dispatchInstantAlertNotification = async ({ user, alerts }) => {
    const delivery = resolveDeliveryChannel(user);
    if (!delivery || !Array.isArray(alerts) || alerts.length === 0) return null;
    const payload = {
        category: 'saved-search-match',
        userId: String(user._id),
        channel: delivery.channel,
        target: delivery.target,
        alertCount: alerts.length,
        searchNames: [...new Set(alerts.map((item) => normalizeText(item.searchName)).filter(Boolean))],
        propertyIds: alerts.map((item) => String(item.propertyId || '')).filter(Boolean),
        sentAt: new Date().toISOString(),
    };
    // eslint-disable-next-line no-console
    console.log('[instant-alert-notify]', JSON.stringify(payload));
    return delivery;
};

const queueInstantAlertsForProperties = async (propertiesInput = []) => {
    const incoming = Array.isArray(propertiesInput) ? propertiesInput : [propertiesInput];
    const properties = incoming.filter((item) => item && item._id && normalizeText(item.status || 'active') !== 'inactive');
    if (properties.length === 0) {
        return { usersNotified: 0, alertsCreated: 0 };
    }

    const users = await User.find({
        'instantAlerts.enabled': true,
        'instantAlerts.savedSearches.enabled': true,
    }).select('_id email phone whatsapp preferredContactMethod instantAlerts').lean();

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

        const delivery = resolveDeliveryChannel(user);
        const newAlerts = [];
        for (const property of properties) {
            for (const search of savedSearches) {
                const searchId = String(search._id || '');
                if (!searchId) continue;
                if (!propertyMatchesCriteria(property, search.criteria || {}, search.sourceContext || {})) continue;
                const dedupeKey = `${String(property._id)}::${searchId}`;
                if (existingKeys.has(dedupeKey)) continue;
                existingKeys.add(dedupeKey);
                newAlerts.push({
                    searchId: search._id,
                    searchName: normalizeText(search.name) || DEFAULT_ALERT_SEARCH_NAME,
                    propertyId: property._id,
                    propertySnapshot: buildPropertySnapshot(property),
                    message: makeAlertMessage(property, search),
                    deliveryChannel: delivery ? delivery.channel : 'in-app',
                    deliveryTarget: delivery ? delivery.target : '',
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
        try {
            await dispatchInstantAlertNotification({ user, alerts: newAlerts });
        } catch (_err) {
            // Notification provider failures should not block inbox creation.
        }

        usersNotified += 1;
        alertsCreated += newAlerts.length;
    }

    return { usersNotified, alertsCreated };
};

module.exports = {
    normalizeAlertCriteria,
    normalizeSourceContext,
    normalizeSearchPayload,
    buildSourceSignature,
    queueInstantAlertsForProperties,
};
