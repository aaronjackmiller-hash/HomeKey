'use strict';

const HEBREW_CHAR_RE = /[א-ת]/;
const HEBREW_DIACRITICS_RE = /[\u0591-\u05C7]/g;

const STREET_TYPE_PREFIXES = [
    { patterns: ['רחוב', 'רח׳', "רח'", 'רח'], suffix: 'St' },
    { patterns: ['שדרות', 'שד׳', "שד'", 'שד'], suffix: 'Blvd' },
    { patterns: ['דרך'], suffix: 'Rd' },
    { patterns: ['סמטה', 'סמטת'], suffix: 'Alley' },
    { patterns: ['כיכר'], suffix: 'Sq' },
];

const PHRASE_TRANSLITERATION_OVERRIDES = {
    'תל אביב': 'Tel Aviv',
    'תל אביב יפו': 'Tel Aviv-Yafo',
    'ירושלים': 'Jerusalem',
    'חיפה': 'Haifa',
    'באר שבע': "Be'er Sheva",
    'ראשון לציון': 'Rishon LeZion',
    'פתח תקווה': 'Petah Tikva',
    'בני ברק': 'Bnei Brak',
    'רמת גן': 'Ramat Gan',
    'בת ים': 'Bat Yam',
    'כפר סבא': 'Kfar Saba',
    'הרצליה': 'Herzliya',
    'רחובות': 'Rehovot',
    'נתניה': 'Netanya',
    'אשדוד': 'Ashdod',
    'אשקלון': 'Ashkelon',
    'ישראל': 'Israel',
    'בן יהודה': 'Ben Yehuda',
    'בן גוריון': 'Ben Gurion',
    'דיזנגוף': 'Dizengoff',
    'ויצמן': 'Weizmann',
    'הרצל': 'Herzl',
    'רוטשילד': 'Rothschild',
    'ביאליק': 'Bialik',
    'אלנבי': 'Allenby',
    'ז׳בוטינסקי': 'Jabotinsky',
    'זבוטינסקי': 'Jabotinsky',
};

const TOKEN_TRANSLITERATION_OVERRIDES = {
    בן: 'Ben',
    בת: 'Bat',
    תל: 'Tel',
    אביב: 'Aviv',
    יפו: 'Yafo',
    דה: 'De',
    לה: 'La',
    של: 'Shel',
    הרב: 'HaRav',
    רבי: 'Rabbi',
    הנשיא: 'HaNasi',
    המלך: 'HaMelekh',
    ירושלים: 'Jerusalem',
    חיפה: 'Haifa',
    ישראל: 'Israel',
};

const HEBREW_TO_LATIN_CHAR_MAP = {
    א: 'a',
    ב: 'b',
    ג: 'g',
    ד: 'd',
    ה: 'h',
    ו: 'v',
    ז: 'z',
    ח: 'kh',
    ט: 't',
    י: 'y',
    כ: 'k',
    ך: 'k',
    ל: 'l',
    מ: 'm',
    ם: 'm',
    נ: 'n',
    ן: 'n',
    ס: 's',
    ע: 'a',
    פ: 'p',
    ף: 'p',
    צ: 'ts',
    ץ: 'ts',
    ק: 'k',
    ר: 'r',
    ש: 'sh',
    ת: 't',
};

const normalizeText = (value) =>
    String(value || '')
        .replace(/\s+/g, ' ')
        .trim();

const containsHebrew = (value) => HEBREW_CHAR_RE.test(String(value || ''));

const uniqueNonEmpty = (values = []) => {
    const seen = new Set();
    return values.filter((value) => {
        const normalized = normalizeText(value);
        if (!normalized) return false;
        const key = normalized.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const toTitleCaseToken = (token) => {
    const trimmed = normalizeText(token);
    if (!trimmed) return '';
    if (/^\d/.test(trimmed)) return trimmed;
    return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1).toLowerCase()}`;
};

const normalizeHebrewForLookup = (value) =>
    normalizeText(value)
        .replace(HEBREW_DIACRITICS_RE, '')
        .replace(/[״"]/g, '')
        .replace(/[׳']/g, '');

const transliterateHebrewToken = (token) => {
    const normalized = normalizeHebrewForLookup(token);
    if (!normalized) return '';
    if (TOKEN_TRANSLITERATION_OVERRIDES[normalized]) return TOKEN_TRANSLITERATION_OVERRIDES[normalized];

    let output = '';
    for (const char of normalized) {
        if (HEBREW_TO_LATIN_CHAR_MAP[char]) {
            output += HEBREW_TO_LATIN_CHAR_MAP[char];
            continue;
        }
        if (/[a-z0-9-]/i.test(char)) {
            output += char;
            continue;
        }
        if (char === ' ') {
            output += ' ';
        }
    }

    const compact = output
        .replace(/aa+/g, 'a')
        .replace(/vv+/g, 'v')
        .replace(/\s+/g, ' ')
        .trim();
    return compact ? toTitleCaseToken(compact) : '';
};

const transliterateHebrewText = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return '';
    if (!containsHebrew(normalized)) return normalized;

    const normalizedForLookup = normalizeHebrewForLookup(normalized);
    if (PHRASE_TRANSLITERATION_OVERRIDES[normalizedForLookup]) {
        return PHRASE_TRANSLITERATION_OVERRIDES[normalizedForLookup];
    }

    return normalized
        .split(/\s+/)
        .map((token) => transliterateHebrewToken(token) || token)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const splitStreetAndNumber = (streetValue, explicitStreetNumber) => {
    let street = normalizeText(streetValue);
    let streetNumber = normalizeText(explicitStreetNumber);

    if (!street && !streetNumber) return { street: '', streetNumber: '' };

    if (!streetNumber) {
        const leadingNumberMatch = street.match(/^(\d+[a-zA-Zא-ת0-9\-\/]*)\s+(.+)$/);
        if (leadingNumberMatch) {
            streetNumber = normalizeText(leadingNumberMatch[1]);
            street = normalizeText(leadingNumberMatch[2]);
        }
    }

    if (!streetNumber) {
        const trailingNumberMatch = street.match(/^(.+?)\s+(\d+[a-zA-Zא-ת0-9\-\/]*)$/);
        if (trailingNumberMatch) {
            street = normalizeText(trailingNumberMatch[1]);
            streetNumber = normalizeText(trailingNumberMatch[2]);
        }
    }

    if (street && streetNumber) {
        const escapedStreetNumber = streetNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        street = street
            .replace(new RegExp(`^${escapedStreetNumber}\\s+`, 'i'), '')
            .replace(new RegExp(`\\s+${escapedStreetNumber}$`, 'i'), '')
            .trim();
    }

    return { street, streetNumber };
};

const extractStreetTypePrefix = (streetName) => {
    const normalizedStreet = normalizeText(streetName);
    if (!normalizedStreet || !containsHebrew(normalizedStreet)) {
        return {
            suffix: '',
            baseStreetName: normalizedStreet,
        };
    }

    for (const rule of STREET_TYPE_PREFIXES) {
        for (const pattern of rule.patterns) {
            const regex = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i');
            if (regex.test(normalizedStreet)) {
                return {
                    suffix: rule.suffix,
                    baseStreetName: normalizedStreet.replace(regex, '').trim(),
                };
            }
        }
    }

    return {
        suffix: '',
        baseStreetName: normalizedStreet,
    };
};

const toEnglishStreet = (streetName, streetNumber) => {
    const normalizedStreet = normalizeText(streetName);
    const normalizedStreetNumber = normalizeText(streetNumber);
    if (!normalizedStreet && !normalizedStreetNumber) return { street: '', streetNumber: '' };

    if (!containsHebrew(normalizedStreet)) {
        return {
            street: normalizedStreet,
            streetNumber: normalizedStreetNumber,
        };
    }

    const { suffix, baseStreetName } = extractStreetTypePrefix(normalizedStreet);
    const transliteratedBaseName = transliterateHebrewText(baseStreetName);
    const streetParts = uniqueNonEmpty([transliteratedBaseName, suffix]);
    return {
        street: streetParts.join(' ').trim(),
        streetNumber: normalizedStreetNumber,
    };
};

const toEnglishAddressField = (value, fieldName) => {
    const normalized = normalizeText(value);
    if (!normalized) return '';
    if (!containsHebrew(normalized)) return normalized;

    if (fieldName === 'country' && normalizeHebrewForLookup(normalized) === 'ישראל') {
        return 'Israel';
    }

    return transliterateHebrewText(normalized);
};

const buildLocalizedAddress = (address = {}) => {
    const sourceAddress = address && typeof address === 'object' ? address : {};
    const splitStreet = splitStreetAndNumber(sourceAddress.street, sourceAddress.streetNumber);
    const sourceStreet = splitStreet.street;
    const sourceStreetNumber = splitStreet.streetNumber;
    const sourceCity = normalizeText(sourceAddress.city);
    const sourceState = normalizeText(sourceAddress.state);
    const sourceZip = normalizeText(sourceAddress.zip);
    const shouldDefaultToHebrewCountry = containsHebrew(sourceStreet) || containsHebrew(sourceCity) || containsHebrew(sourceState);
    const sourceCountry = normalizeText(sourceAddress.country) || (shouldDefaultToHebrewCountry ? 'ישראל' : 'Israel');

    const englishStreet = toEnglishStreet(sourceStreet, sourceStreetNumber);
    const localizedEn = {
        street: englishStreet.street,
        streetNumber: englishStreet.streetNumber || sourceStreetNumber,
        city: toEnglishAddressField(sourceCity, 'city'),
        state: toEnglishAddressField(sourceState, 'state'),
        country: toEnglishAddressField(sourceCountry, 'country'),
    };

    const localizedHe = {
        street: sourceStreet,
        streetNumber: sourceStreetNumber,
        city: sourceCity,
        state: sourceState,
        country: sourceCountry,
    };

    return {
        street: sourceStreet,
        ...(sourceStreetNumber ? { streetNumber: sourceStreetNumber } : {}),
        ...(sourceCity ? { city: sourceCity } : {}),
        ...(sourceState ? { state: sourceState } : {}),
        ...(sourceZip ? { zip: sourceZip } : {}),
        ...(sourceCountry ? { country: sourceCountry } : {}),
        localized: {
            he: localizedHe,
            en: localizedEn,
        },
    };
};

module.exports = {
    buildLocalizedAddress,
    transliterateHebrewText,
};
