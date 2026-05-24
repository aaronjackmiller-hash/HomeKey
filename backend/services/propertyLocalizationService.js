'use strict';

const SUPPORTED_LANGUAGES = ['en', 'he'];
const HEBREW_CHAR_REGEX = /[\u0590-\u05FF]/;
const LATIN_CHAR_REGEX = /[A-Za-z]/;
const TRANSLATION_CACHE = new Map();
const TRANSLATION_TIMEOUT_MS = 5000;

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

const parseBooleanEnv = (value, fallback = false) => {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
};

const shouldAutoTranslateImportedContent = () =>
    parseBooleanEnv(process.env.IMPORTED_CONTENT_AUTO_TRANSLATE, true);

const getOppositeLanguage = (language) => (language === 'he' ? 'en' : (language === 'en' ? 'he' : ''));

const translateText = async (text, targetLanguage) => {
    const normalizedText = normalizeString(text);
    const language = normalizeLanguageCode(targetLanguage);
    if (!normalizedText || !language) return '';
    const cacheKey = `${language}:${normalizedText}`;
    if (TRANSLATION_CACHE.has(cacheKey)) return TRANSLATION_CACHE.get(cacheKey);

    const endpoint = new URL('https://translate.googleapis.com/translate_a/single');
    endpoint.searchParams.set('client', 'gtx');
    endpoint.searchParams.set('sl', 'auto');
    endpoint.searchParams.set('tl', language);
    endpoint.searchParams.set('dt', 't');
    endpoint.searchParams.set('q', normalizedText);

    try {
        const response = await fetch(endpoint.toString(), {
            signal: AbortSignal.timeout(TRANSLATION_TIMEOUT_MS),
        });
        if (!response.ok) return '';
        const payload = await response.json();
        const translated = Array.isArray(payload && payload[0])
            ? payload[0]
                .map((chunk) => (Array.isArray(chunk) ? normalizeString(chunk[0]) : ''))
                .filter(Boolean)
                .join(' ')
            : '';
        const normalizedTranslated = normalizeString(translated);
        if (!normalizedTranslated) return '';
        TRANSLATION_CACHE.set(cacheKey, normalizedTranslated);
        return normalizedTranslated;
    } catch (_err) {
        return '';
    }
};

const enrichLocalizedContentForImport = async ({
    title,
    description,
    contentLanguage,
    localizedContent,
}) => {
    const sourceLanguage = normalizeLanguageCode(contentLanguage);
    const baseLocalized = mergeLocalizedContent(
        sanitizeLocalizedContent(localizedContent),
        sourceLanguage
            ? {
                [sourceLanguage]: {
                    title: normalizeString(title),
                    description: normalizeString(description),
                },
            }
            : {}
    );
    if (!sourceLanguage || !shouldAutoTranslateImportedContent()) return baseLocalized;

    const targetLanguage = getOppositeLanguage(sourceLanguage);
    if (!targetLanguage) return baseLocalized;
    const targetLocalized = baseLocalized[targetLanguage] || {};
    const missingTitle = !normalizeString(targetLocalized.title) && normalizeString(title);
    const missingDescription = !normalizeString(targetLocalized.description) && normalizeString(description);
    if (!missingTitle && !missingDescription) return baseLocalized;

    const translatedLocalized = { ...targetLocalized };
    if (missingTitle) {
        translatedLocalized.title = await translateText(normalizeString(title), targetLanguage);
    }
    if (missingDescription) {
        translatedLocalized.description = await translateText(normalizeString(description), targetLanguage);
    }
    return mergeLocalizedContent(baseLocalized, {
        [targetLanguage]: translatedLocalized,
    });
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
    translateText,
    enrichLocalizedContentForImport,
    getRequestedContentLanguage,
    applyPropertyLocalization,
};
