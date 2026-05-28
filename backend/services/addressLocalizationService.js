'use strict';

const { translateText } = require('./propertyLocalizationService');
const { buildLocalizedAddress } = require('../utils/addressLocalization');

const HEBREW_CHAR_RE = /[א-ת]/;
const MIN_TRANSLATABLE_LENGTH = 2;
const STREET_TYPE_RULES = [
    { patterns: ['רחוב', 'רח׳', "רח'", 'רח'], suffix: 'St' },
    { patterns: ['שדרות', 'שד׳', "שד'", 'שד'], suffix: 'Blvd' },
    { patterns: ['דרך'], suffix: 'Rd' },
    { patterns: ['סמטה', 'סמטת'], suffix: 'Alley' },
    { patterns: ['כיכר'], suffix: 'Sq' },
];

const normalizeText = (value) =>
    String(value || '')
        .replace(/\s+/g, ' ')
        .trim();

const containsHebrew = (value) => HEBREW_CHAR_RE.test(String(value || ''));

const sanitizeObject = (value) => (value && typeof value === 'object' ? value : {});

const extractStreetTypeRule = (hebrewStreet = '') => {
    const sourceStreet = normalizeText(hebrewStreet);
    if (!sourceStreet || !containsHebrew(sourceStreet)) return null;
    for (const rule of STREET_TYPE_RULES) {
        for (const pattern of rule.patterns) {
            const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`^${escaped}\\s+`, 'i');
            if (regex.test(sourceStreet)) {
                return rule;
            }
        }
    }
    return null;
};

const normalizeTranslatedStreet = ({ sourceStreet, translatedStreet, fallbackStreet }) => {
    const translated = normalizeText(translatedStreet);
    const fallback = normalizeText(fallbackStreet);
    if (!translated) return fallback;

    const streetTypeRule = extractStreetTypeRule(sourceStreet);
    if (!streetTypeRule || !streetTypeRule.suffix) return translated;

    const suffixAliases = {
        St: ['street', 'st', 'st.'],
        Blvd: ['boulevard', 'blvd', 'blvd.'],
        Rd: ['road', 'rd', 'rd.', 'way', 'through'],
        Alley: ['alley'],
        Sq: ['square', 'sq', 'sq.'],
    };
    const aliases = suffixAliases[streetTypeRule.suffix] || [];
    const leadingTypePattern = /^(street|st\.?|boulevard|blvd\.?|road|rd\.?|way|through|alley|square|sq\.?)\s+/i;
    let normalized = translated.replace(leadingTypePattern, '').replace(/\s+/g, ' ').trim();
    if (!normalized) return fallback || translated;

    const lowerNormalized = normalized.toLowerCase();
    const matchedSuffix = aliases.find((alias) => lowerNormalized.endsWith(` ${alias}`) || lowerNormalized === alias);
    if (matchedSuffix) {
        const suffixPattern = new RegExp(`(?:\\s+|^)${matchedSuffix.replace('.', '\\.')}$`, 'i');
        normalized = normalized.replace(suffixPattern, '').trim();
    }

    if (!normalized) return fallback || translated;
    return `${normalized} ${streetTypeRule.suffix}`.trim();
};

const shouldTranslateHebrewField = ({
    sourceValue,
    explicitEnglishValue,
}) => {
    const source = normalizeText(sourceValue);
    if (!source || !containsHebrew(source) || source.length < MIN_TRANSLATABLE_LENGTH) return false;

    const explicitEnglish = normalizeText(explicitEnglishValue);
    if (explicitEnglish && !containsHebrew(explicitEnglish)) return false;

    return true;
};

const toEnglishFieldValue = async ({
    sourceValue,
    fallbackValue,
    explicitEnglishValue,
    fieldName,
}) => {
    const fallback = normalizeText(fallbackValue);
    const explicitEnglish = normalizeText(explicitEnglishValue);
    const source = normalizeText(sourceValue);

    // Keep curated/normalized neighborhood labels when an English value already exists.
    if (fieldName === 'neighborhood' && fallback && !containsHebrew(fallback)) {
        return explicitEnglish || fallback;
    }

    if (!shouldTranslateHebrewField({ sourceValue: source, explicitEnglishValue: explicitEnglish })) {
        return explicitEnglish || fallback;
    }

    const translated = normalizeText(await translateText(source, 'en'));
    if (translated && !containsHebrew(translated)) {
        if (fieldName === 'street') {
            return normalizeTranslatedStreet({
                sourceStreet: source,
                translatedStreet: translated,
                fallbackStreet: fallback,
            });
        }
        return translated;
    }

    return explicitEnglish || fallback;
};

const enrichAddressLocalization = async (address = {}) => {
    const baseAddress = buildLocalizedAddress(address);
    const incomingAddress = sanitizeObject(address);
    const incomingLocalized = sanitizeObject(incomingAddress.localized);
    const incomingLocalizedEn = sanitizeObject(incomingLocalized.en);

    const localized = sanitizeObject(baseAddress.localized);
    const localizedHe = sanitizeObject(localized.he);
    const localizedEn = sanitizeObject(localized.en);

    const [street, neighborhood, city, state] = await Promise.all([
        toEnglishFieldValue({
            sourceValue: localizedHe.street || baseAddress.street,
            fallbackValue: localizedEn.street,
            explicitEnglishValue: incomingLocalizedEn.street,
            fieldName: 'street',
        }),
        toEnglishFieldValue({
            sourceValue: localizedHe.neighborhood || baseAddress.neighborhood,
            fallbackValue: localizedEn.neighborhood,
            explicitEnglishValue: incomingLocalizedEn.neighborhood,
        }),
        toEnglishFieldValue({
            sourceValue: localizedHe.city || baseAddress.city,
            fallbackValue: localizedEn.city,
            explicitEnglishValue: incomingLocalizedEn.city,
        }),
        toEnglishFieldValue({
            sourceValue: localizedHe.state || baseAddress.state,
            fallbackValue: localizedEn.state,
            explicitEnglishValue: incomingLocalizedEn.state,
        }),
    ]);

    return {
        ...baseAddress,
        localized: {
            he: localizedHe,
            en: {
                ...localizedEn,
                ...(street ? { street } : {}),
                ...(neighborhood ? { neighborhood } : {}),
                ...(city ? { city } : {}),
                ...(state ? { state } : {}),
            },
        },
    };
};

module.exports = {
    enrichAddressLocalization,
};
