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

const STREET_TRANSLITERATION_DICTIONARY_GLOBAL = {
    'נסים אלוני': 'Nissim Aloni',
    'טשרניחובסקי': 'Tchernikhovsky',
    'ארלוזורוב': 'Arlozorov',
    'אבן גבירול': 'Ibn Gabirol',
    'בוגרשוב': 'Bograshov',
    'החשמונאים': 'Hashmonaim',
    'הרכבת': 'HaRakevet',
    'יהודה הלוי': 'Yehuda Halevi',
    'יגאל אלון': 'Yigal Alon',
    'יצחק שדה': 'Yitzhak Sadeh',
    'לבונטין': 'Levontin',
    'לילינבלום': 'Lilienblum',
    'מונטיפיורי': 'Montefiore',
    'נחלת בנימין': 'Nahalat Binyamin',
    'קפלן': 'Kaplan',
    'קרליבך': 'Carlebach',
    'רבין': 'Rabin',
    'שינקין': 'Shenkin',
};

const STREET_TRANSLITERATION_DICTIONARY_BY_CITY = {
    'תל אביב יפו': {
        'נסים אלוני': 'Nissim Aloni',
        'טשרניחובסקי': 'Tchernikhovsky',
        'יגאל אלון': 'Yigal Alon',
        'נחלת בנימין': 'Nahalat Binyamin',
        'יהודה הלוי': 'Yehuda Halevi',
    },
    'תל אביב': {
        'נסים אלוני': 'Nissim Aloni',
    },
};

const STREET_TRANSLITERATION_LATIN_ALIASES_GLOBAL = {
    'nysym alvny': 'Nissim Aloni',
    'nysim alvny': 'Nissim Aloni',
    'nisym alvny': 'Nissim Aloni',
    'tshrnykhvbsky': 'Tchernikhovsky',
};

const STREET_TRANSLITERATION_LATIN_ALIASES_BY_CITY = {
    'תל אביב יפו': {
        'nysym alvny': 'Nissim Aloni',
        'nysim alvny': 'Nissim Aloni',
    },
};

const NEIGHBORHOOD_TRANSLITERATION_OVERRIDES = {
    'נוה צדק': 'Neve Tzedek',
    'פלורנטין': 'Florentin',
    'הצפון הישן - דרום': 'Old North - South',
    'הצפון הישן-דרום': 'Old North - South',
    'הצפון הישן - החלק הצפוני': 'Old North - North Section',
    'הצפון הישן-החלק הדרומי': 'Old North - South Section',
    'הצפון הישן': 'Old North',
    'פארק צמרת': 'Park Tzameret',
    'לב תל אביב': 'Lev Tel Aviv',
    'לב תל-אביב': 'Lev Tel Aviv',
};

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

const sanitizeLocalizedAddress = (value) => (value && typeof value === 'object' ? value : {});

const getLocalizedAddressByLanguage = (localizedAddress, language) => {
    const source = localizedAddress && typeof localizedAddress === 'object' ? localizedAddress[language] : null;
    return source && typeof source === 'object' ? source : {};
};

const preferExistingEnglishValue = (existingValue, fallbackValue) => {
    const normalizedExisting = normalizeText(existingValue);
    if (normalizedExisting && !containsHebrew(normalizedExisting)) return normalizedExisting;
    return normalizeText(fallbackValue);
};

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

const normalizeHebrewDictionaryKey = (value) =>
    normalizeHebrewForLookup(value)
        .replace(/[-־]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const normalizeLatinDictionaryKey = (value) =>
    normalizeText(value)
        .toLowerCase()
        .replace(/[’'`"]/g, '')
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/[-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const buildNormalizedStreetDictionary = (sourceDictionary = {}) => {
    const output = {};
    Object.entries(sourceDictionary).forEach(([rawKey, transliterated]) => {
        const key = normalizeHebrewDictionaryKey(rawKey);
        const value = normalizeText(transliterated);
        if (!key || !value) return;
        output[key] = value;
    });
    return output;
};

const buildLatinStreetDictionary = ({ transliterationDictionary = {}, aliasDictionary = {} } = {}) => {
    const output = {};

    Object.values(transliterationDictionary).forEach((canonicalValue) => {
        const canonical = normalizeText(canonicalValue);
        const key = normalizeLatinDictionaryKey(canonical);
        if (!key || !canonical) return;
        output[key] = canonical;
    });

    Object.entries(aliasDictionary).forEach(([aliasValue, canonicalValue]) => {
        const key = normalizeLatinDictionaryKey(aliasValue);
        const canonical = normalizeText(canonicalValue);
        if (!key || !canonical) return;
        output[key] = canonical;
    });

    return output;
};

const NORMALIZED_STREET_TRANSLITERATION_DICTIONARY_GLOBAL =
    buildNormalizedStreetDictionary(STREET_TRANSLITERATION_DICTIONARY_GLOBAL);

const NORMALIZED_STREET_TRANSLITERATION_DICTIONARY_BY_CITY = Object.entries(
    STREET_TRANSLITERATION_DICTIONARY_BY_CITY
).reduce((acc, [cityName, entries]) => {
    const cityKey = normalizeHebrewDictionaryKey(cityName);
    if (!cityKey || !entries || typeof entries !== 'object') return acc;
    acc[cityKey] = buildNormalizedStreetDictionary(entries);
    return acc;
}, {});

const NORMALIZED_STREET_TRANSLITERATION_LATIN_GLOBAL = buildLatinStreetDictionary({
    transliterationDictionary: STREET_TRANSLITERATION_DICTIONARY_GLOBAL,
    aliasDictionary: STREET_TRANSLITERATION_LATIN_ALIASES_GLOBAL,
});

const NORMALIZED_STREET_TRANSLITERATION_LATIN_BY_CITY = Object.entries(
    STREET_TRANSLITERATION_DICTIONARY_BY_CITY
).reduce((acc, [cityName, entries]) => {
    const cityKey = normalizeHebrewDictionaryKey(cityName);
    if (!cityKey || !entries || typeof entries !== 'object') return acc;
    acc[cityKey] = buildLatinStreetDictionary({
        transliterationDictionary: entries,
        aliasDictionary: STREET_TRANSLITERATION_LATIN_ALIASES_BY_CITY[cityName] || {},
    });
    return acc;
}, {});

const NORMALIZED_NEIGHBORHOOD_TRANSLITERATION_OVERRIDES = Object.entries(
    NEIGHBORHOOD_TRANSLITERATION_OVERRIDES
).reduce((acc, [rawName, transliterated]) => {
    const key = normalizeHebrewDictionaryKey(rawName);
    const value = normalizeText(transliterated);
    if (!key || !value) return acc;
    acc[key] = value;
    return acc;
}, {});

const generateLatinLookupVariants = (value) => {
    const base = normalizeLatinDictionaryKey(value);
    if (!base) return [];
    const variants = new Set([base]);
    const addVariant = (candidate) => {
        const normalized = normalizeLatinDictionaryKey(candidate);
        if (normalized) variants.add(normalized);
    };

    addVariant(base.replace(/y/g, 'i'));
    addVariant(base.replace(/v/g, 'o'));
    addVariant(base.replace(/y/g, 'i').replace(/v/g, 'o'));
    addVariant(base.replace(/w/g, 'v'));
    addVariant(base.replace(/([a-z])\1+/g, '$1'));
    addVariant(base.replace(/y/g, 'i').replace(/([a-z])\1+/g, '$1'));

    return Array.from(variants);
};

const levenshteinDistance = (a, b) => {
    const source = String(a || '');
    const target = String(b || '');
    if (!source) return target.length;
    if (!target) return source.length;

    const matrix = Array.from({ length: source.length + 1 }, () => new Array(target.length + 1).fill(0));
    for (let i = 0; i <= source.length; i += 1) matrix[i][0] = i;
    for (let j = 0; j <= target.length; j += 1) matrix[0][j] = j;

    for (let i = 1; i <= source.length; i += 1) {
        for (let j = 1; j <= target.length; j += 1) {
            const cost = source[i - 1] === target[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    return matrix[source.length][target.length];
};

const resolveLatinStreetDictionaryMatch = (dictionary, variants) => {
    if (!dictionary || typeof dictionary !== 'object' || variants.length === 0) return '';

    for (const variant of variants) {
        if (dictionary[variant]) return dictionary[variant];
    }

    let best = null;
    let second = null;
    const entries = Object.entries(dictionary);
    for (const [candidateKey, canonicalValue] of entries) {
        for (const variant of variants) {
            const distance = levenshteinDistance(variant, candidateKey);
            const maxAllowed = Math.max(1, Math.floor(Math.min(variant.length, candidateKey.length) * 0.2));
            if (distance > maxAllowed) continue;
            const score = { distance, canonicalValue, candidateKey };
            if (!best || score.distance < best.distance) {
                second = best;
                best = score;
            } else if (!second || score.distance < second.distance) {
                second = score;
            }
        }
    }

    if (!best) return '';
    if (second && second.distance === best.distance) return '';
    return best.canonicalValue;
};

const lookupStreetDictionaryTransliterationFromHebrew = (streetName, cityName) => {
    const streetKey = normalizeHebrewDictionaryKey(streetName);
    if (!streetKey) return '';

    const cityKey = normalizeHebrewDictionaryKey(cityName);
    const cityDictionary = cityKey
        ? NORMALIZED_STREET_TRANSLITERATION_DICTIONARY_BY_CITY[cityKey]
        : null;
    if (cityDictionary && cityDictionary[streetKey]) {
        return cityDictionary[streetKey];
    }

    return NORMALIZED_STREET_TRANSLITERATION_DICTIONARY_GLOBAL[streetKey] || '';
};

const lookupStreetDictionaryTransliterationFromLatin = (streetName, cityName) => {
    const variants = generateLatinLookupVariants(streetName);
    if (variants.length === 0) return '';

    const cityKey = normalizeHebrewDictionaryKey(cityName);
    const cityDictionary = cityKey
        ? NORMALIZED_STREET_TRANSLITERATION_LATIN_BY_CITY[cityKey]
        : null;
    const cityMatch = resolveLatinStreetDictionaryMatch(cityDictionary, variants);
    if (cityMatch) return cityMatch;

    return resolveLatinStreetDictionaryMatch(NORMALIZED_STREET_TRANSLITERATION_LATIN_GLOBAL, variants);
};

const lookupNeighborhoodTransliteration = (neighborhoodName) => {
    const key = normalizeHebrewDictionaryKey(neighborhoodName);
    if (!key) return '';
    return NORMALIZED_NEIGHBORHOOD_TRANSLITERATION_OVERRIDES[key] || '';
};

const toEnglishAddressField = (value, fieldName = '') => {
    const normalized = normalizeText(value);
    if (!normalized) return '';
    if (!containsHebrew(normalized)) return normalized;

    if (fieldName === 'country' && normalizeHebrewForLookup(normalized) === 'ישראל') {
        return 'Israel';
    }
    if (fieldName === 'neighborhood') {
        return lookupNeighborhoodTransliteration(normalized) || transliterateHebrewText(normalized);
    }
    return transliterateHebrewText(normalized);
};

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

const toEnglishStreet = (streetName, streetNumber, cityName) => {
    const normalizedStreet = normalizeText(streetName);
    const normalizedStreetNumber = normalizeText(streetNumber);
    if (!normalizedStreet && !normalizedStreetNumber) return { street: '', streetNumber: '' };

    if (!containsHebrew(normalizedStreet)) {
        const dictionaryTransliteration = lookupStreetDictionaryTransliterationFromLatin(normalizedStreet, cityName);
        return {
            street: dictionaryTransliteration || normalizedStreet,
            streetNumber: normalizedStreetNumber,
        };
    }

    const { suffix, baseStreetName } = extractStreetTypePrefix(normalizedStreet);
    const dictionaryTransliteration = lookupStreetDictionaryTransliterationFromHebrew(baseStreetName, cityName);
    const transliteratedBaseName = dictionaryTransliteration || transliterateHebrewText(baseStreetName);
    const streetParts = uniqueNonEmpty([transliteratedBaseName, suffix]);
    return {
        street: streetParts.join(' ').trim(),
        streetNumber: normalizedStreetNumber,
    };
};

const buildLocalizedAddress = (address = {}) => {
    const sourceAddress = address && typeof address === 'object' ? address : {};
    const sourceLocalizedAddress = sanitizeLocalizedAddress(sourceAddress.localized);
    const sourceLocalizedHe = getLocalizedAddressByLanguage(sourceLocalizedAddress, 'he');
    const sourceLocalizedEn = getLocalizedAddressByLanguage(sourceLocalizedAddress, 'en');
    const sourceStreetRaw = normalizeText(sourceAddress.street)
        || normalizeText(sourceLocalizedHe.street)
        || normalizeText(sourceLocalizedEn.street);
    const sourceStreetNumberRaw = normalizeText(sourceAddress.streetNumber)
        || normalizeText(sourceLocalizedHe.streetNumber)
        || normalizeText(sourceLocalizedEn.streetNumber);
    const splitStreet = splitStreetAndNumber(sourceStreetRaw, sourceStreetNumberRaw);
    const sourceStreet = splitStreet.street;
    const sourceStreetNumber = splitStreet.streetNumber;
    const sourceNeighborhood = normalizeText(sourceAddress.neighborhood)
        || normalizeText(sourceLocalizedHe.neighborhood)
        || normalizeText(sourceLocalizedEn.neighborhood);
    const sourceCity = normalizeText(sourceAddress.city)
        || normalizeText(sourceLocalizedHe.city)
        || normalizeText(sourceLocalizedEn.city);
    const sourceState = normalizeText(sourceAddress.state)
        || normalizeText(sourceLocalizedHe.state)
        || normalizeText(sourceLocalizedEn.state);
    const sourceZip = normalizeText(sourceAddress.zip);
    const shouldDefaultToHebrewCountry = (
        containsHebrew(sourceStreet)
        || containsHebrew(sourceNeighborhood)
        || containsHebrew(sourceCity)
        || containsHebrew(sourceState)
    );
    const sourceCountry = normalizeText(sourceAddress.country)
        || normalizeText(sourceLocalizedHe.country)
        || normalizeText(sourceLocalizedEn.country)
        || (shouldDefaultToHebrewCountry ? 'ישראל' : 'Israel');

    const englishStreet = toEnglishStreet(sourceStreet, sourceStreetNumber, sourceCity);
    const localizedEn = {
        street: preferExistingEnglishValue(sourceLocalizedEn.street, englishStreet.street),
        streetNumber: normalizeText(sourceLocalizedEn.streetNumber) || englishStreet.streetNumber || sourceStreetNumber,
        neighborhood: preferExistingEnglishValue(
            sourceLocalizedEn.neighborhood,
            toEnglishAddressField(sourceNeighborhood, 'neighborhood')
        ),
        city: preferExistingEnglishValue(sourceLocalizedEn.city, toEnglishAddressField(sourceCity, 'city')),
        state: preferExistingEnglishValue(sourceLocalizedEn.state, toEnglishAddressField(sourceState, 'state')),
        country: preferExistingEnglishValue(sourceLocalizedEn.country, toEnglishAddressField(sourceCountry, 'country')),
    };

    const localizedHe = {
        street: normalizeText(sourceLocalizedHe.street) || sourceStreet,
        streetNumber: normalizeText(sourceLocalizedHe.streetNumber) || sourceStreetNumber,
        neighborhood: normalizeText(sourceLocalizedHe.neighborhood) || sourceNeighborhood,
        city: normalizeText(sourceLocalizedHe.city) || sourceCity,
        state: normalizeText(sourceLocalizedHe.state) || sourceState,
        country: normalizeText(sourceLocalizedHe.country) || sourceCountry,
    };

    return {
        street: sourceStreet,
        ...(sourceStreetNumber ? { streetNumber: sourceStreetNumber } : {}),
        ...(sourceNeighborhood ? { neighborhood: sourceNeighborhood } : {}),
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
