'use strict';

const Property = require('../models/Property');

const normalizeString = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const normalizeAddressPart = (value) =>
    normalizeString(value).replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeTitleTokens = (title) =>
    normalizeAddressPart(title)
        .split(' ')
        .filter((token) => token.length >= 3);

const normalizeEmail = (value) => normalizeString(value);

const normalizePhone = (value) => {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
    if (!raw) return '';
    const digits = raw.replace(/[^\d]/g, '');
    if (digits.length < 9) return '';
    if (digits.length === 10 && digits.startsWith('0')) return `972${digits.slice(1)}`;
    if (digits.length === 11 && digits.startsWith('00')) return digits.slice(2);
    return digits;
};

const normalizeUrl = (value) => {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return '';
    try {
        const parsed = new URL(raw);
        const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
        const pathname = parsed.pathname.replace(/\/+$/, '');
        return `${host}${pathname}`;
    } catch (_err) {
        return normalizeString(raw).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
    }
};

const extractStreetAndNumber = (address = {}) => {
    const streetRaw = normalizeAddressPart(address.street);
    const streetNumberRaw = normalizeAddressPart(address.streetNumber);
    if (streetNumberRaw) {
        return {
            street: streetRaw.replace(new RegExp(`\\b${escapeRegex(streetNumberRaw)}\\b`, 'i'), '').trim() || streetRaw,
            streetNumber: streetNumberRaw,
        };
    }
    const match = streetRaw.match(/^(.*?)(?:\s+|,)(\d+[a-zA-Zא-ת0-9\-\/]*)$/i);
    if (!match) {
        return { street: streetRaw, streetNumber: '' };
    }
    return {
        street: normalizeAddressPart(match[1]),
        streetNumber: normalizeAddressPart(match[2]),
    };
};

const toIntegerOrNull = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.round(parsed);
};

const toPositiveOrNull = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
};

const buildPropertyIdentityKey = (propertyLike = {}) => {
    const type = normalizeString(propertyLike.type);
    const city = normalizeAddressPart(propertyLike.address?.city);
    const { street, streetNumber } = extractStreetAndNumber(propertyLike.address || {});
    const bedrooms = toIntegerOrNull(propertyLike.bedrooms);
    const size = toPositiveOrNull(propertyLike.size);

    if (!type || !city || !street || !streetNumber || bedrooms == null || size == null) {
        return '';
    }

    return [
        type,
        city,
        street,
        streetNumber,
        bedrooms,
        Math.round(size / 5) * 5,
    ].join('|');
};

const collectContactTokens = (propertyLike = {}) => {
    const phoneTokens = new Set();
    const emailTokens = new Set();

    const phone = normalizePhone(propertyLike.contact?.phone);
    const whatsapp = normalizePhone(propertyLike.contact?.whatsapp);
    const email = normalizeEmail(propertyLike.contact?.email);

    if (phone) phoneTokens.add(phone);
    if (whatsapp) phoneTokens.add(whatsapp);
    if (email) emailTokens.add(email);

    return { phoneTokens, emailTokens };
};

const getDateMs = (value) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const chooseDisplayPreferredProperty = (current, incoming) => {
    const currentSourceCount = Array.isArray(current?.sources) ? current.sources.length : 0;
    const incomingSourceCount = Array.isArray(incoming?.sources) ? incoming.sources.length : 0;
    if (incomingSourceCount !== currentSourceCount) {
        return incomingSourceCount > currentSourceCount ? incoming : current;
    }
    const currentUpdatedAt = getDateMs(current?.updatedAt || current?.createdAt);
    const incomingUpdatedAt = getDateMs(incoming?.updatedAt || incoming?.createdAt);
    if (incomingUpdatedAt !== currentUpdatedAt) {
        return incomingUpdatedAt > currentUpdatedAt ? incoming : current;
    }
    const currentImageCount = Array.isArray(current?.images) ? current.images.length : 0;
    const incomingImageCount = Array.isArray(incoming?.images) ? incoming.images.length : 0;
    if (incomingImageCount !== currentImageCount) {
        return incomingImageCount > currentImageCount ? incoming : current;
    }
    return current;
};

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
    const { streetNumber: payloadStreetNumber } = extractStreetAndNumber(payload.address || {});
    const { streetNumber: candidateStreetNumber } = extractStreetAndNumber(candidate.address || {});

    if (payloadCity && candidateCity && payloadCity === candidateCity) score += 3;
    if (payloadStreet && candidateStreet && payloadStreet === candidateStreet) score += 3;
    if (payloadStreetNumber && candidateStreetNumber && payloadStreetNumber === candidateStreetNumber) score += 2;

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

    const payloadIdentityKey = buildPropertyIdentityKey(payload);
    const candidateIdentityKey = buildPropertyIdentityKey(candidate);
    if (payloadIdentityKey && candidateIdentityKey && payloadIdentityKey === candidateIdentityKey) {
        score += 7;
    }

    const payloadUrl = normalizeUrl(payload.externalUrl);
    const candidateUrl = normalizeUrl(candidate.externalUrl);
    if (payloadUrl && candidateUrl && payloadUrl === candidateUrl) score += 3;

    const payloadSource = normalizeString(payload.externalSource);
    const payloadExternalId = normalizeString(payload.externalId);
    const candidateSource = normalizeString(candidate.externalSource);
    const candidateExternalId = normalizeString(candidate.externalId);
    if (
        payloadSource &&
        payloadExternalId &&
        candidateSource &&
        candidateExternalId &&
        payloadSource === candidateSource &&
        payloadExternalId === candidateExternalId
    ) {
        score += 10;
    }

    const payloadContact = collectContactTokens(payload);
    const candidateContact = collectContactTokens(candidate);
    const hasSharedPhone = [...payloadContact.phoneTokens].some((token) => candidateContact.phoneTokens.has(token));
    const hasSharedEmail = [...payloadContact.emailTokens].some((token) => candidateContact.emailTokens.has(token));
    if (hasSharedPhone) score += 2;
    if (hasSharedEmail) score += 2;

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

const isStrongPropertyIdentityMatch = (candidate, payload) => {
    const candidateKey = buildPropertyIdentityKey(candidate);
    const payloadKey = buildPropertyIdentityKey(payload);
    if (candidateKey && payloadKey && candidateKey === payloadKey) {
        return true;
    }

    const candidateSource = normalizeString(candidate?.externalSource);
    const payloadSource = normalizeString(payload?.externalSource);
    const candidateExternalId = normalizeString(candidate?.externalId);
    const payloadExternalId = normalizeString(payload?.externalId);
    if (
        candidateSource &&
        payloadSource &&
        candidateExternalId &&
        payloadExternalId &&
        candidateSource === payloadSource &&
        candidateExternalId === payloadExternalId
    ) {
        return true;
    }

    const candidateUrl = normalizeUrl(candidate?.externalUrl);
    const payloadUrl = normalizeUrl(payload?.externalUrl);
    if (candidateUrl && payloadUrl && candidateUrl === payloadUrl) {
        return true;
    }

    const candidateCity = normalizeAddressPart(candidate?.address?.city);
    const payloadCity = normalizeAddressPart(payload?.address?.city);
    const { street: candidateStreet, streetNumber: candidateStreetNumber } = extractStreetAndNumber(candidate?.address || {});
    const { street: payloadStreet, streetNumber: payloadStreetNumber } = extractStreetAndNumber(payload?.address || {});
    const sameAddress =
        candidateCity &&
        payloadCity &&
        candidateStreet &&
        payloadStreet &&
        candidateStreetNumber &&
        payloadStreetNumber &&
        candidateCity === payloadCity &&
        candidateStreet === payloadStreet &&
        candidateStreetNumber === payloadStreetNumber;
    if (sameAddress) {
        const bedroomsDelta = Math.abs(Number(candidate?.bedrooms || 0) - Number(payload?.bedrooms || 0));
        const sizeRatio = getPriceDifferenceRatio(candidate?.size, payload?.size);
        const priceRatio = getPriceDifferenceRatio(candidate?.price, payload?.price);
        if (bedroomsDelta <= 1 && sizeRatio <= 0.18 && priceRatio <= 0.35) {
            return true;
        }
    }

    return false;
};

const findDuplicateCandidate = async (payload, { excludePropertyId } = {}) => {
    const payloadSource = normalizeString(payload.externalSource);
    const payloadExternalId = normalizeString(payload.externalId);
    if (payloadSource && payloadExternalId) {
        const exactQuery = {
            $or: [
                { externalSource: payloadSource, externalId: payloadExternalId },
                {
                    sources: {
                        $elemMatch: {
                            externalSource: payloadSource,
                            externalId: payloadExternalId,
                        },
                    },
                },
            ],
        };
        if (excludePropertyId) {
            exactQuery._id = { $ne: excludePropertyId };
        }
        const exactMatch = await Property.findOne(exactQuery)
            .select('_id title type price bedrooms bathrooms size address sourceType sources owner contact externalSource externalId externalUrl updatedAt createdAt');
        if (exactMatch) return exactMatch;
    }

    const city = normalizeAddressPart(payload.address?.city);
    const { street, streetNumber } = extractStreetAndNumber(payload.address || {});
    const payloadContact = collectContactTokens(payload);
    const hasContactSignal = payloadContact.phoneTokens.size > 0 || payloadContact.emailTokens.size > 0;
    if (!payload.type && !city && !street && !hasContactSignal) return null;

    const query = {
        ...(payload.type ? { type: payload.type } : {}),
    };
    const orClauses = [];
    if (city) {
        orClauses.push({
            'address.city': new RegExp(`^${escapeRegex(city)}$`, 'i'),
        });
    }
    if (city && street) {
        orClauses.push({
            'address.city': new RegExp(`^${escapeRegex(city)}$`, 'i'),
            'address.street': new RegExp(`^${escapeRegex(street)}$`, 'i'),
            ...(streetNumber ? { 'address.streetNumber': new RegExp(`^${escapeRegex(streetNumber)}$`, 'i') } : {}),
        });
    }
    payloadContact.phoneTokens.forEach((token) => {
        const phoneRegex = new RegExp(`${token.slice(-9)}$`);
        orClauses.push({
            $or: [{ 'contact.phone': phoneRegex }, { 'contact.whatsapp': phoneRegex }],
        });
    });
    payloadContact.emailTokens.forEach((token) => {
        orClauses.push({ 'contact.email': token });
    });
    const payloadUrl = normalizeUrl(payload.externalUrl);
    if (payloadUrl) {
        orClauses.push({ externalUrl: new RegExp(escapeRegex(payloadUrl), 'i') });
    }

    if (!orClauses.length) return null;
    query.$or = orClauses;

    if (excludePropertyId) {
        query._id = { $ne: excludePropertyId };
    }

    const candidates = await Property.find(query)
        .select('_id title type price bedrooms bathrooms size address sourceType sources owner contact externalSource externalId externalUrl updatedAt createdAt')
        .limit(60);
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

    if (!best) return null;
    if (isStrongPropertyIdentityMatch(best, payload)) return best;
    if (bestScore < 8) return null;
    return best;
};

const dedupePropertiesForDisplay = (properties = []) => {
    if (!Array.isArray(properties) || properties.length <= 1) return Array.isArray(properties) ? properties : [];
    const deduped = [];
    const keyIndexMap = new Map();

    for (const property of properties) {
        const identityKey = buildPropertyIdentityKey(property);
        if (!identityKey) {
            deduped.push(property);
            continue;
        }
        if (!keyIndexMap.has(identityKey)) {
            keyIndexMap.set(identityKey, deduped.length);
            deduped.push(property);
            continue;
        }
        const index = keyIndexMap.get(identityKey);
        deduped[index] = chooseDisplayPreferredProperty(deduped[index], property);
    }

    return deduped;
};

module.exports = {
    appendSourceIfMissing,
    buildPropertyIdentityKey,
    dedupePropertiesForDisplay,
    findDuplicateCandidate,
    isStrongPropertyIdentityMatch,
};
