'use strict';

const Property = require('../models/Property');

const normalizeString = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const normalizeAddressPart = (value) =>
    normalizeString(value).replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();

const normalizeTitleTokens = (title) =>
    normalizeAddressPart(title)
        .split(' ')
        .filter((token) => token.length >= 3);

const getPriceDifferenceRatio = (a, b) => {
    const n1 = Number(a);
    const n2 = Number(b);
    if (!Number.isFinite(n1) || !Number.isFinite(n2) || n1 <= 0 || n2 <= 0) return 1;
    return Math.abs(n1 - n2) / Math.max(n1, n2);
};

const scoreDuplicateCandidate = (candidate, payload) => {
    let score = 0;
    const payloadCity = normalizeAddressPart(payload.address?.city);
    const payloadStreet = normalizeAddressPart(payload.address?.street);
    const payloadTitleTokens = new Set(normalizeTitleTokens(payload.title));

    const candidateCity = normalizeAddressPart(candidate.address?.city);
    const candidateStreet = normalizeAddressPart(candidate.address?.street);
    const candidateTitleTokens = new Set(normalizeTitleTokens(candidate.title));

    if (payloadCity && candidateCity && payloadCity === candidateCity) score += 3;
    if (payloadStreet && candidateStreet && payloadStreet === candidateStreet) score += 3;

    const bedroomsDelta = Math.abs(Number(candidate.bedrooms || 0) - Number(payload.bedrooms || 0));
    if (bedroomsDelta === 0) score += 2;
    else if (bedroomsDelta <= 1) score += 1;

    const sizeRatio = getPriceDifferenceRatio(candidate.size, payload.size);
    if (sizeRatio <= 0.08) score += 2;
    else if (sizeRatio <= 0.18) score += 1;

    const priceRatio = getPriceDifferenceRatio(candidate.price, payload.price);
    if (priceRatio <= 0.08) score += 2;
    else if (priceRatio <= 0.18) score += 1;

    let overlap = 0;
    for (const token of payloadTitleTokens) {
        if (candidateTitleTokens.has(token)) overlap += 1;
    }
    if (overlap >= 3) score += 2;
    else if (overlap >= 1) score += 1;

    return score;
};

const appendSourceIfMissing = (propertyDoc, sourceEntry) => {
    const sources = Array.isArray(propertyDoc.sources) ? propertyDoc.sources : [];
    const exists = sources.some((source) =>
        source.sourceType === sourceEntry.sourceType &&
        normalizeString(source.externalSource) === normalizeString(sourceEntry.externalSource) &&
        normalizeString(source.externalId) === normalizeString(sourceEntry.externalId) &&
        normalizeString(source.externalUrl) === normalizeString(sourceEntry.externalUrl)
    );
    if (!exists) {
        propertyDoc.sources = [...sources, sourceEntry];
    }
};

const findDuplicateCandidate = async (payload, { excludePropertyId } = {}) => {
    const city = payload.address?.city?.trim();
    if (!city || !payload.type) return null;

    const query = {
        type: payload.type,
        'address.city': new RegExp(`^${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    };
    if (excludePropertyId) {
        query._id = { $ne: excludePropertyId };
    }

    const candidates = await Property.find(query)
        .select('_id title type price bedrooms size address sourceType sources owner contact')
        .limit(30);
    if (!candidates.length) return null;

    let best = null;
    let bestScore = 0;
    for (const candidate of candidates) {
        const score = scoreDuplicateCandidate(candidate, payload);
        if (score > bestScore) {
            best = candidate;
            bestScore = score;
        }
    }

    if (bestScore < 7) return null;
    return best;
};

module.exports = {
    appendSourceIfMissing,
    findDuplicateCandidate,
};
