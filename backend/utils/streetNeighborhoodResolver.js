'use strict';

const HEBREW_DIACRITICS_RE = /[\u0591-\u05C7]/g;

const TEL_AVIV_CITY_ALIASES = new Set([
    'tel aviv',
    'tel aviv yafo',
    'tel aviv-yafo',
    'תל אביב',
    'תל אביב יפו',
    'תל אביב-יפו',
]);

const STREET_PREFIX_PATTERNS = [
    'רחוב',
    'רח׳',
    "רח'",
    'רח',
    'שדרות',
    'שד׳',
    "שד'",
    'שד',
    'דרך',
    'כיכר',
    'סמטה',
    'סמטת',
    'street',
    'st',
    'boulevard',
    'blvd',
    'road',
    'rd',
    'avenue',
    'ave',
    'derech',
    'rehov',
];

const TEL_AVIV_STREET_NEIGHBORHOOD_SEED = [
    {
        neighborhoodHe: 'לב תל אביב',
        neighborhoodEn: 'Lev Tel Aviv',
        streets: [
            'אלנבי',
            'allenby',
            'שינקין',
            'shenkin',
            'נחלת בנימין',
            'nahalat binyamin',
            'רוטשילד',
            'rothschild',
            'אחד העם',
            "ahad ha'am",
            'king george',
            'המלך ג׳ורג׳',
            'המלך גורג',
        ],
    },
    {
        neighborhoodHe: 'נווה צדק',
        neighborhoodEn: 'Neve Tzedek',
        streets: [
            'שבזי',
            'shabazi',
            'שבזי',
            'אמזלג',
            'amzaleg',
            'קויפמן',
            'kaufmann',
            'yahieli',
            'יחיאלי',
            'פינס',
            'pines',
        ],
    },
    {
        neighborhoodHe: 'פלורנטין',
        neighborhoodEn: 'Florentin',
        streets: [
            'פלורנטין',
            'florentin',
            'לוינסקי',
            'levinsky',
            'ויטל',
            'vital',
            'אבולעפיה',
            'abulafia',
            'סלמה',
            'salame',
        ],
    },
    {
        neighborhoodHe: 'הצפון הישן',
        neighborhoodEn: 'Old North',
        streets: [
            'דיזנגוף',
            'dizengoff',
            'בן יהודה',
            'ben yehuda',
            'ארלוזורוב',
            'arlozorov',
            'פרישמן',
            'frishman',
            'גורדון',
            'gordon',
            'בוגרשוב',
            'bugrashov',
        ],
    },
    {
        neighborhoodHe: 'מונטיפיורי',
        neighborhoodEn: 'Montefiore',
        streets: [
            'החשמונאים',
            'hashmonaim',
            'קרליבך',
            'carlebach',
            'הרכבת',
            'harakevet',
            'יצחק שדה',
            'yitzhak sadeh',
            'דרך מנחם בגין',
            'menachem begin',
        ],
    },
    {
        neighborhoodHe: 'פארק צמרת',
        neighborhoodEn: 'Park Tzameret',
        streets: [
            'נסים אלוני',
            'nissim aloni',
        ],
    },
    {
        neighborhoodHe: 'רמת אביב',
        neighborhoodEn: 'Ramat Aviv',
        streets: [
            'חיים לבנון',
            'haim levanon',
            'איינשטיין',
            'einstein',
            'איינשטין',
        ],
    },
    {
        neighborhoodHe: 'יד אליהו',
        neighborhoodEn: 'Yad Eliyahu',
        streets: [
            'יגאל אלון',
            'yigal alon',
            'דרך השלום',
            'derech hashalom',
        ],
    },
    {
        neighborhoodHe: 'כרם התימנים',
        neighborhoodEn: 'Kerem HaTeimanim',
        streets: [
            'גאולה',
            'geula',
            'הכרמל',
            'hacarmel',
            'hakarmel',
        ],
    },
];

const normalizeText = (value) =>
    String(value || '')
        .replace(/\s+/g, ' ')
        .trim();

const normalizeHebrew = (value) =>
    normalizeText(value)
        .replace(HEBREW_DIACRITICS_RE, '')
        .replace(/[״"]/g, '')
        .replace(/[׳']/g, '');

const normalizeCityKey = (value) =>
    normalizeHebrew(value)
        .toLowerCase()
        .replace(/[.,]/g, ' ')
        .replace(/[-־]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const stripHouseNumber = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return '';
    return normalized
        .replace(/^\d+[a-zA-Zא-ת0-9\-\/]*\s+/, '')
        .replace(/\s+\d+[a-zA-Zא-ת0-9\-\/]*$/, '')
        .trim();
};

const stripStreetPrefix = (value) => {
    let current = normalizeText(value);
    if (!current) return '';

    for (let i = 0; i < 3; i += 1) {
        const before = current;
        STREET_PREFIX_PATTERNS.forEach((pattern) => {
            const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            current = current.replace(new RegExp(`^${escaped}\\s+`, 'i'), '').trim();
        });
        if (before === current) break;
    }
    return current;
};

const normalizeStreetKey = (value) => {
    const base = normalizeHebrew(value)
        .toLowerCase()
        .replace(/[.,()]/g, ' ')
        .replace(/[-־]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!base) return '';
    const withoutNumber = stripHouseNumber(base);
    const withoutPrefix = stripStreetPrefix(withoutNumber);
    return stripHouseNumber(withoutPrefix)
        .replace(/\s+/g, ' ')
        .trim();
};

const parseBoolean = (value, fallback = true) => {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
};

const buildStreetLookup = () => {
    const map = new Map();
    const ambiguousKeys = new Set();

    TEL_AVIV_STREET_NEIGHBORHOOD_SEED.forEach((entry) => {
        const payload = {
            he: normalizeText(entry.neighborhoodHe),
            en: normalizeText(entry.neighborhoodEn),
        };
        if (!payload.he || !payload.en || !Array.isArray(entry.streets)) return;
        entry.streets.forEach((streetAlias) => {
            const key = normalizeStreetKey(streetAlias);
            if (!key || ambiguousKeys.has(key)) return;
            const existing = map.get(key);
            if (existing && (existing.he !== payload.he || existing.en !== payload.en)) {
                ambiguousKeys.add(key);
                map.delete(key);
                return;
            }
            map.set(key, payload);
        });
    });

    return map;
};

const STREET_LOOKUP = buildStreetLookup();

const isTelAvivCity = (cityValue) => TEL_AVIV_CITY_ALIASES.has(normalizeCityKey(cityValue));

const inferNeighborhoodFromStreet = ({ street = '', city = '', neighborhood = '' } = {}) => {
    if (!parseBoolean(process.env.STREET_NEIGHBORHOOD_INFERENCE_ENABLED, true)) return null;
    if (normalizeText(neighborhood)) return null;
    if (!isTelAvivCity(city)) return null;
    const streetKey = normalizeStreetKey(street);
    if (!streetKey) return null;
    const match = STREET_LOOKUP.get(streetKey);
    if (!match) return null;
    return {
        he: match.he,
        en: match.en,
    };
};

module.exports = {
    inferNeighborhoodFromStreet,
    normalizeStreetKey,
};
