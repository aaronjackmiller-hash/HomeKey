'use strict';

const { translateText } = require('./propertyLocalizationService');
const { buildLocalizedAddress } = require('../utils/addressLocalization');

const HEBREW_CHAR_RE = /[א-ת]/;
const MIN_TRANSLATABLE_LENGTH = 2;

const normalizeText = (value) =>
    String(value || '')
        .replace(/\s+/g, ' ')
        .trim();

const containsHebrew = (value) => HEBREW_CHAR_RE.test(String(value || ''));

const sanitizeObject = (value) => (value && typeof value === 'object' ? value : {});

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
}) => {
    const fallback = normalizeText(fallbackValue);
    const explicitEnglish = normalizeText(explicitEnglishValue);
    const source = normalizeText(sourceValue);

    if (!shouldTranslateHebrewField({ sourceValue: source, explicitEnglishValue: explicitEnglish })) {
        return explicitEnglish || fallback;
    }

    const translated = normalizeText(await translateText(source, 'en'));
    if (translated && !containsHebrew(translated)) {
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
