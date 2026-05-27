'use strict';

const AMENITY_KEYS = Object.freeze([
    'modernKitchen',
    'airConditioning',
    'balcony',
    'secureParking',
    'safeRoom',
    'elevator',
    'renovated',
    'secureBuilding',
]);

const AMENITY_PATTERNS = Object.freeze({
    modernKitchen: [/\bkitchen(?:ette)?\b/i, /מטבח(?:ון)?/i],
    airConditioning: [/\bair[\s-]*condition(?:ing)?\b/i, /\ba\/?c\b/i, /מזגן/i, /מיזוג/i],
    balcony: [/\bbalcony\b/i, /\bterrace\b/i, /sun[\s-]*terrace/i, /מרפסת/i],
    secureParking: [/\bparking\b/i, /\bgarage\b/i, /\bcarport\b/i, /חניה/i, /חניון/i],
    safeRoom: [/\bsafe[\s-]*room\b/i, /\bsecurity[\s-]*room\b/i, /\bmamad\b/i, /ממ["״']?ד/i, /ממד/i],
    elevator: [/\belevator\b/i, /\blift\b/i, /מעלית/i],
    renovated: [/\brenovat(?:ed|ion|e)?\b/i, /\brefurbish(?:ed|ment)?\b/i, /משופצ/i],
    secureBuilding: [/\bsecure\b/i, /\bdoorman\b/i, /\bguard\b/i, /\bintercom\b/i, /שומר/i, /אינטרקום/i, /מאובטח/i],
});

const normalizeText = (value) => String(value || '').trim();

const dedupeCaseInsensitive = (values = []) => {
    const seen = new Set();
    const output = [];
    for (const value of values) {
        const normalized = normalizeText(value);
        if (!normalized) continue;
        const key = normalized.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        output.push(normalized);
    }
    return output;
};

const collectTokens = (value, output, depth = 0) => {
    if (value == null || depth > 5) return;
    if (Array.isArray(value)) {
        value.forEach((entry) => collectTokens(entry, output, depth + 1));
        return;
    }
    if (typeof value === 'string' || typeof value === 'number') {
        const text = normalizeText(value);
        if (text) output.push(text);
        return;
    }
    if (typeof value !== 'object') return;

    for (const [key, nestedValue] of Object.entries(value)) {
        const normalizedKey = normalizeText(key);
        if (typeof nestedValue === 'boolean') {
            if (nestedValue && normalizedKey) output.push(normalizedKey);
            continue;
        }
        if (typeof nestedValue === 'string' || typeof nestedValue === 'number') {
            const nestedText = normalizeText(nestedValue);
            if (normalizedKey) output.push(normalizedKey);
            if (nestedText) {
                output.push(nestedText);
                if (normalizedKey) output.push(`${normalizedKey} ${nestedText}`);
            }
            continue;
        }
        if (normalizedKey) output.push(normalizedKey);
        collectTokens(nestedValue, output, depth + 1);
    }
};

const parseAmenityArray = (values = [], { max = 8 } = {}) => {
    if (!Array.isArray(values) || values.length === 0) return [];
    const result = [];
    for (const value of values) {
        const key = normalizeText(value);
        if (!key || !AMENITY_KEYS.includes(key) || result.includes(key)) continue;
        result.push(key);
        if (result.length >= max) break;
    }
    return result;
};

const matchAmenitiesFromTokens = (tokens = []) => {
    const haystack = tokens.join(' ').toLowerCase();
    return AMENITY_KEYS.filter((key) => {
        const patterns = AMENITY_PATTERNS[key] || [];
        return patterns.some((pattern) => pattern.test(haystack));
    });
};

const extractAmenitiesFromRow = (row = {}, { buildingName = '', max = 8 } = {}) => {
    const candidates = [
        row.amenities,
        row.features,
        row.featuresText,
        row.attributes,
        row.attributesText,
        row.tags,
        row.keywords,
        row.options,
        row.facilities,
        row.featureList,
        row.featureTags,
        row.propertyFeatures,
        row.details && row.details.amenities,
        row.details && row.details.features,
        row.details && row.details.featuresText,
        row.specs && row.specs.amenities,
        row.specs && row.specs.features,
        row.specs && row.specs.featuresText,
        row.buildingDetails && row.buildingDetails.amenities,
        row.buildingDetails && row.buildingDetails.features,
        row.building && row.building.amenities,
        row.building && row.building.features,
        row.description,
        row.body,
        row.notes,
        row.title,
    ];

    const rawTokens = [];
    candidates.forEach((candidate) => collectTokens(candidate, rawTokens));
    const tokens = dedupeCaseInsensitive(rawTokens);
    const matched = matchAmenitiesFromTokens(tokens);

    if (normalizeText(buildingName) && !matched.includes('secureBuilding')) {
        matched.push('secureBuilding');
    }
    return matched.slice(0, max);
};

module.exports = {
    AMENITY_KEYS,
    parseAmenityArray,
    extractAmenitiesFromRow,
};
