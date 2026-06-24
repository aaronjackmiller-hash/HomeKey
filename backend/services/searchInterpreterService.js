'use strict';

const PRICE_MIN = 0;
const PRICE_MAX = 20000;
const PRICE_STEP = 500;
const MAX_PROMPT_LENGTH = 500;
const FEATURE_OPTIONS = ['elevator', 'parking', 'pets', 'disabled-access', 'renovated', 'furnished', 'mamad', 'dishwasher'];
const PROPERTY_CATEGORY_OPTIONS = ['apartments', 'houses'];
const ROOM_OPTIONS = ['', 'studio', '1', '2', '3', '4+'];
const BATH_OPTIONS = ['', '1', '2', '3+'];

const AI_LISTING_TYPE_KEYWORDS = {
    rental: ['rent', 'rental', 'lease', 'השכרה', 'להשכרה', 'שכירות'],
    sale: ['buy', 'sale', 'purchase', 'for sale', 'מכירה', 'למכירה', 'קניה', 'קנייה', 'לקנות'],
};

const AI_PROPERTY_CATEGORY_KEYWORDS = {
    apartments: ['apartment', 'studio', 'condo', 'flat', 'penthouse', 'דירה', 'דירות', 'סטודיו', 'פנטהאוז'],
    houses: ['house', 'home', 'villa', 'duplex', 'townhouse', 'בית', 'בתים', 'וילה', 'דו משפחתי', 'קוטג'],
};

const AI_FEATURE_KEYWORDS = {
    elevator: ['elevator', 'lift', 'מעלית'],
    parking: ['parking', 'garage', 'carport', 'חניה', 'חנייה', 'חניון'],
    pets: ['pet', 'pets', 'dog', 'cat', 'בעלי חיים', 'חיות מחמד', 'כלב', 'חתול'],
    'disabled-access': ['accessible', 'wheelchair', 'disabled', 'נגיש', 'נגישות', 'כיסא גלגלים'],
    renovated: ['renovated', 'refurbished', 'משופץ', 'משופצת'],
    furnished: ['furnished', 'מרוהט', 'מרוהטת'],
    mamad: ['mamad', 'safe room', 'security room', 'ממד', 'ממ"ד', 'חדר ביטחון', 'חדר בטחון'],
    dishwasher: ['dishwasher', 'מדיח'],
};

const HEBREW_CITY_HINTS = [
    ['תל אביב', ['תל אביב', 'בתל אביב']],
    ['ירושלים', ['ירושלים', 'בירושלים']],
    ['חיפה', ['חיפה', 'בחיפה']],
    ['רעננה', ['רעננה', 'ברעננה']],
    ['רמת גן', ['רמת גן', 'ברמת גן']],
    ['פתח תקווה', ['פתח תקווה', 'בפתח תקווה']],
    ['באר שבע', ['באר שבע', 'בבאר שבע']],
    ['הרצליה', ['הרצליה', 'בהרצליה']],
    ['נתניה', ['נתניה', 'בנתניה']],
    ['ראשון לציון', ['ראשון לציון', 'בראשון לציון']],
    ['רחובות', ['רחובות', 'ברחובות']],
    ['גבעתיים', ['גבעתיים', 'בגבעתיים']],
    ['הוד השרון', ['הוד השרון', 'בהוד השרון']],
];

const getOpenAiApiKey = () => String(process.env.OPENAI_API_KEY || process.env.AI_SEARCH_OPENAI_API_KEY || '').trim();

const getOpenAiModel = () => String(process.env.AI_SEARCH_MODEL || 'gpt-4o-mini').trim();

const includesAnyKeyword = (searchText = '', keywords = []) =>
    keywords.some((keyword) => searchText.includes(keyword.toLowerCase()));

const clampPriceValue = (value) => {
    const asNumber = Number(value);
    if (!Number.isFinite(asNumber)) return null;
    return Math.min(PRICE_MAX, Math.max(PRICE_MIN, Math.round(asNumber / PRICE_STEP) * PRICE_STEP));
};

const normalizePrompt = (rawPrompt = '') =>
    String(rawPrompt || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_PROMPT_LENGTH);

const normalizeRoomCount = (value) => {
    if (value == null || String(value).trim() === '') return '';
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'studio') return 'studio';
    if (normalized.endsWith('+')) {
        const minRooms = Number(normalized.slice(0, -1));
        return Number.isFinite(minRooms) && minRooms >= 4 ? '4+' : '';
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) return '';
    if (parsed >= 4) return '4+';
    return String(parsed);
};

const normalizeBathCount = (value) => {
    if (value == null || String(value).trim() === '') return '';
    const normalized = String(value).trim().toLowerCase();
    if (normalized.endsWith('+')) {
        const minBathrooms = Number(normalized.slice(0, -1));
        return Number.isFinite(minBathrooms) && minBathrooms >= 3 ? '3+' : '';
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) return '';
    if (parsed >= 3) return '3+';
    return String(parsed);
};

const parseAiBudgetToken = (rawToken = '') => {
    const normalized = String(rawToken || '')
        .trim()
        .toLowerCase()
        .replace(/[,$₪\s]/g, '');
    if (!normalized) return null;
    const isThousands = normalized.endsWith('k') || normalized.endsWith('אלף');
    const numericPart = normalized.replace(/k$/, '').replace(/אלף$/, '');
    const parsed = Number(numericPart);
    if (!Number.isFinite(parsed)) return null;
    return Math.round(parsed * (isThousands ? 1000 : 1));
};

const parseAiPriceRange = (rawInput = '') => {
    const normalized = String(rawInput || '').toLowerCase();
    let minPrice = null;
    let maxPrice = null;

    const betweenMatch = normalized.match(
        /(?:between|from|בין|מ)\s*[$₪]?\s*([\d.,]+(?:k|אלף)?)\s*(?:and|to|-|עד|ל)\s*[$₪]?\s*([\d.,]+(?:k|אלף)?)/
    );
    if (betweenMatch) {
        const firstValue = parseAiBudgetToken(betweenMatch[1]);
        const secondValue = parseAiBudgetToken(betweenMatch[2]);
        if (firstValue != null && secondValue != null) {
            minPrice = clampPriceValue(Math.min(firstValue, secondValue));
            maxPrice = clampPriceValue(Math.max(firstValue, secondValue));
            return { minPrice, maxPrice };
        }
    }

    const maxMatch = normalized.match(
        /(?:under|below|max(?:imum)?|up to|less than|עד|מתחת|פחות מ|מקסימום)\s*[$₪]?\s*([\d.,]+(?:k|אלף)?)/
    );
    if (maxMatch) {
        const parsedMax = parseAiBudgetToken(maxMatch[1]);
        if (parsedMax != null) maxPrice = clampPriceValue(parsedMax);
    }

    const minMatch = normalized.match(
        /(?:over|above|min(?:imum)?|starting at|at least|מעל|לפחות|מינימום)\s*[$₪]?\s*([\d.,]+(?:k|אלף)?)/
    );
    if (minMatch) {
        const parsedMin = parseAiBudgetToken(minMatch[1]);
        if (parsedMin != null) minPrice = clampPriceValue(parsedMin);
    }

    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
        const midpoint = clampPriceValue((minPrice + maxPrice) / 2);
        return { minPrice: midpoint, maxPrice: midpoint };
    }

    return { minPrice, maxPrice };
};

const extractCityCandidate = (rawInput = '') => {
    const normalizedRaw = String(rawInput || '').toLowerCase();
    const cityHint = HEBREW_CITY_HINTS.find(([, variants]) =>
        variants.some((variant) => normalizedRaw.includes(variant))
    );
    if (cityHint) return cityHint[0];

    const strippedText = String(rawInput || '')
        .replace(/[$₪]/g, ' ')
        .replace(/\b(\d+[.,]?\d*k?|studio|bed(?:room)?s?|br|bath(?:room)?s?|ba|rent|rental|lease|buy|sale|purchase|house|home|apartment|flat|condo|villa|duplex|townhouse|parking|garage|carport|elevator|lift|pet(?:s)?|dog|cat|accessible|wheelchair|disabled|renovated|refurbished|furnished|mamad|safe room|security room|under|below|max(?:imum)?|up to|less than|over|above|min(?:imum)?|starting at|at least|between|from|to|and|with|in|near|around|at)\b/gi, ' ')
        .replace(/(להשכרה|השכרה|שכירות|למכירה|מכירה|קנייה|קניה|לקנות|דירה|דירות|בית|בתים|וילה|חניה|חנייה|מעלית|משופץ|משופצת|מרוהט|מרוהטת|ממ"ד|ממד|חדר ביטחון|חדר בטחון|עד|מתחת|מעל|לפחות|מקסימום|מינימום|עם|ליד|באזור|בין|חדרים|חדרי שינה|מקלחות|אמבטיות)/g, ' ')
        .replace(/[^\p{L}\s-]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!strippedText) return '';
    return strippedText
        .split(/\s+/)
        .slice(0, 4)
        .join(' ')
        .trim();
};

const buildFallbackInterpretation = (prompt) => {
    const normalized = prompt.toLowerCase();
    let type = 'all';
    if (includesAnyKeyword(normalized, AI_LISTING_TYPE_KEYWORDS.rental)) {
        type = 'rental';
    } else if (includesAnyKeyword(normalized, AI_LISTING_TYPE_KEYWORDS.sale)) {
        type = 'sale';
    }

    let propertyCategory = '';
    if (includesAnyKeyword(normalized, AI_PROPERTY_CATEGORY_KEYWORDS.apartments)) {
        propertyCategory = 'apartments';
    } else if (includesAnyKeyword(normalized, AI_PROPERTY_CATEGORY_KEYWORDS.houses)) {
        propertyCategory = 'houses';
    }

    const features = FEATURE_OPTIONS.filter((featureId) =>
        includesAnyKeyword(normalized, AI_FEATURE_KEYWORDS[featureId] || [])
    );

    let rooms = '';
    if (/\bstudio\b|סטודיו/i.test(normalized)) {
        rooms = 'studio';
    } else {
        const roomPlusMatch = normalized.match(/(\d+)\s*\+\s*(?:bed|br|bedroom|חדר)/i);
        const roomMatch = normalized.match(/(\d+)\s*(?:bed|br|bedroom)s?\b|(\d+)\s*(?:חדרי שינה|חדרים|חדר)/i);
        rooms = normalizeRoomCount((roomPlusMatch && roomPlusMatch[1]) || (roomMatch && (roomMatch[1] || roomMatch[2])) || '');
    }

    const bathPlusMatch = normalized.match(/(\d+)\s*\+\s*(?:bath|ba|bathroom|מקלח|אמבט)/i);
    const bathMatch = normalized.match(/(\d+)\s*(?:bath|ba|bathroom)s?\b|(\d+)\s*(?:מקלחות|אמבטיות|חדרי רחצה)/i);
    const baths = normalizeBathCount((bathPlusMatch && bathPlusMatch[1]) || (bathMatch && (bathMatch[1] || bathMatch[2])) || '');
    const { minPrice, maxPrice } = parseAiPriceRange(normalized);
    const q = extractCityCandidate(prompt) || prompt;

    return normalizeSearchFilters({
        q,
        type,
        rooms,
        baths,
        minPrice,
        maxPrice,
        propertyCategory,
        features,
    });
};

const normalizeSearchFilters = (rawFilters = {}) => {
    const normalizedType = String(rawFilters.type || '').trim().toLowerCase();
    const rooms = normalizeRoomCount(rawFilters.rooms);
    const baths = normalizeBathCount(rawFilters.baths);
    const propertyCategory = String(rawFilters.propertyCategory || '').trim().toLowerCase();
    const rawFeatures = Array.isArray(rawFilters.features) ? rawFilters.features : [];
    const minPrice = clampPriceValue(rawFilters.minPrice);
    const maxPrice = clampPriceValue(rawFilters.maxPrice);

    let normalizedMinPrice = minPrice;
    let normalizedMaxPrice = maxPrice;
    if (normalizedMinPrice != null && normalizedMaxPrice != null && normalizedMinPrice > normalizedMaxPrice) {
        const midpoint = clampPriceValue((normalizedMinPrice + normalizedMaxPrice) / 2);
        normalizedMinPrice = midpoint;
        normalizedMaxPrice = midpoint;
    }

    return {
        q: String(rawFilters.q || rawFilters.city || '').replace(/\s+/g, ' ').trim().slice(0, 120),
        type: normalizedType === 'sale' || normalizedType === 'rental' ? normalizedType : 'all',
        rooms: ROOM_OPTIONS.includes(rooms) ? rooms : '',
        baths: BATH_OPTIONS.includes(baths) ? baths : '',
        minPrice: normalizedMinPrice != null && normalizedMinPrice > PRICE_MIN ? normalizedMinPrice : null,
        maxPrice: normalizedMaxPrice != null && normalizedMaxPrice < PRICE_MAX ? normalizedMaxPrice : null,
        propertyCategory: PROPERTY_CATEGORY_OPTIONS.includes(propertyCategory) ? propertyCategory : '',
        features: rawFeatures
            .map((feature) => String(feature || '').trim().toLowerCase())
            .filter((feature, index, values) => FEATURE_OPTIONS.includes(feature) && values.indexOf(feature) === index),
    };
};

const parseModelJson = (content = '') => {
    const trimmed = String(content || '').trim();
    if (!trimmed) throw new Error('Empty AI response');
    try {
        return JSON.parse(trimmed);
    } catch (_err) {
        const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw _err;
        return JSON.parse(jsonMatch[0]);
    }
};

const callOpenAiInterpreter = async ({ prompt, language }) => {
    const apiKey = getOpenAiApiKey();
    if (!apiKey) return null;
    if (typeof fetch !== 'function') {
        throw new Error('Fetch API is unavailable in this Node.js runtime.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: getOpenAiModel(),
            temperature: 0.1,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: [
                        'You convert real-estate mobile search requests into JSON filters for HomeKey.',
                        'Return only JSON with this shape:',
                        '{"q":"","type":"all","rooms":"","baths":"","minPrice":null,"maxPrice":null,"propertyCategory":"","features":[],"confidence":0.0}',
                        'Allowed type values: all, sale, rental.',
                        'Allowed rooms values: "", studio, 1, 2, 3, 4+.',
                        'Allowed baths values: "", 1, 2, 3+.',
                        'Allowed propertyCategory values: "", apartments, houses.',
                        `Allowed features: ${FEATURE_OPTIONS.join(', ')}.`,
                        'Put explicit city, neighborhood, street, or location text in q.',
                        'Use hard constraints only. Do not invent filters.',
                        'For fuzzy preferences like quiet, bright, near cafes, leave them in q only if they are important location/listing words.',
                    ].join('\n'),
                },
                {
                    role: 'user',
                    content: JSON.stringify({ prompt, language: language || 'en' }),
                },
            ],
        }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const message = payload?.error?.message || `OpenAI request failed with status ${response.status}`;
        throw new Error(message);
    }

    const content = payload?.choices?.[0]?.message?.content;
    const parsed = parseModelJson(content);
    return {
        filters: normalizeSearchFilters(parsed?.filters || parsed),
        confidence: Math.max(0, Math.min(1, Number(parsed?.confidence) || 0)),
    };
};

const interpretSearchPrompt = async ({ prompt: rawPrompt, language = 'en' }) => {
    const prompt = normalizePrompt(rawPrompt);
    if (!prompt) {
        return {
            filters: normalizeSearchFilters({}),
            source: 'empty',
            confidence: 0,
            fallbackUsed: false,
        };
    }

    try {
        const modelInterpretation = await callOpenAiInterpreter({ prompt, language });
        if (modelInterpretation) {
            console.info('[ai-search] interpreted prompt with OpenAI', {
                source: 'openai',
                confidence: modelInterpretation.confidence,
                filters: modelInterpretation.filters,
            });
            return {
                filters: modelInterpretation.filters,
                source: 'openai',
                confidence: modelInterpretation.confidence,
                fallbackUsed: false,
            };
        }
    } catch (err) {
        console.warn('[ai-search] OpenAI interpretation failed; using fallback parser:', err.message);
    }

    const filters = buildFallbackInterpretation(prompt);
    console.info('[ai-search] interpreted prompt with fallback parser', {
        source: 'fallback',
        filters,
    });
    return {
        filters,
        source: 'fallback',
        confidence: 0.45,
        fallbackUsed: true,
    };
};

module.exports = {
    interpretSearchPrompt,
    normalizeSearchFilters,
    buildFallbackInterpretation,
};
