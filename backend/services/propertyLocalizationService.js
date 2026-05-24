'use strict';

const SUPPORTED_LANGUAGES = ['en', 'he'];
const HEBREW_CHAR_REGEX = /[\u0590-\u05FF]/;
const LATIN_CHAR_REGEX = /[A-Za-z]/;

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeLanguageCode = (value, fallback = '') => {
    const normalized = normalizeString(value).toLowerCase();
    if (normalized.startsWith('he')) return 'he';
    if (normalized.startsWith('en')) return 'en';
    return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : fallback;
};

const detectContentLanguage = (...textValues) => {
    let hebrewChars = 0;
    let latinChars = 0;
    textValues.forEach((value) => {
        const text = normalizeString(value);
        if (!text) return;
        const hebrewMatches = text.match(new RegExp(HEBREW_CHAR_REGEX.source, 'g')) || [];
        const latinMatches = text.match(new RegExp(LATIN_CHAR_REGEX.source, 'g')) || [];
        hebrewChars += hebrewMatches.length;
        latinChars += latinMatches.length;
    });
    if (hebrewChars === 0 && latinChars === 0) return 'unknown';
    if (hebrewChars > latinChars) return 'he';
    if (latinChars > hebrewChars) return 'en';
    return 'unknown';
};

const sanitizeLocalizedContent = (localizedContent = {}) => {
    const result = {};
    SUPPORTED_LANGUAGES.forEach((language) => {
        const source = localizedContent && typeof localizedContent === 'object' ? localizedContent[language] : null;
        if (!source || typeof source !== 'object') return;
        const title = normalizeString(source.title);
        const description = normalizeString(source.description);
        if (!title && !description) return;
        result[language] = {};
        if (title) result[language].title = title;
        if (description) result[language].description = description;
    });
    return result;
};

const mergeLocalizedContent = (existingContent = {}, incomingContent = {}) => {
    const existing = sanitizeLocalizedContent(existingContent);
    const incoming = sanitizeLocalizedContent(incomingContent);
    const merged = {};
    SUPPORTED_LANGUAGES.forEach((language) => {
        const title = normalizeString(
            (incoming[language] && incoming[language].title)
            || (existing[language] && existing[language].title)
        );
        const description = normalizeString(
            (incoming[language] && incoming[language].description)
            || (existing[language] && existing[language].description)
        );
        if (!title && !description) return;
        merged[language] = {};
        if (title) merged[language].title = title;
        if (description) merged[language].description = description;
    });
    return merged;
};

const getRequestedContentLanguage = (req) => {
    const fromQuery = normalizeLanguageCode(req && req.query && req.query.lang);
    if (fromQuery) return fromQuery;
    const acceptLanguage = normalizeString(req && req.headers && req.headers['accept-language']);
    if (!acceptLanguage) return 'en';
    const firstToken = acceptLanguage.split(',')[0] || '';
    return normalizeLanguageCode(firstToken, 'en');
};

const applyPropertyLocalization = (propertyDoc, requestedLanguage) => {
    if (!propertyDoc) return propertyDoc;
    const targetLanguage = normalizeLanguageCode(requestedLanguage);
    if (!targetLanguage) {
        return propertyDoc.toObject ? propertyDoc.toObject() : propertyDoc;
    }

    const asObject = propertyDoc.toObject ? propertyDoc.toObject() : { ...propertyDoc };
    const localizedContent = sanitizeLocalizedContent(asObject.localizedContent);
    const localizedTarget = localizedContent[targetLanguage] || {};
    if (localizedTarget.title) asObject.title = localizedTarget.title;
    if (localizedTarget.description) asObject.description = localizedTarget.description;
    asObject.localizedContent = localizedContent;
    return asObject;
};

module.exports = {
    SUPPORTED_LANGUAGES,
    normalizeLanguageCode,
    detectContentLanguage,
    sanitizeLocalizedContent,
    mergeLocalizedContent,
    getRequestedContentLanguage,
    applyPropertyLocalization,
};
