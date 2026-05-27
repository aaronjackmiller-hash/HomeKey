const safeText = (value) => (typeof value === 'string' ? value.trim() : '');
const containsHebrew = (value) => /[א-ת]/.test(String(value || ''));
const HEBREW_DIACRITICS_RE = /[\u0591-\u05C7]/g;
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
const PHRASE_TRANSLITERATION_OVERRIDES = {
  ישראל: 'Israel',
  'תל אביב': 'Tel Aviv',
  'תל אביב יפו': 'Tel Aviv-Yafo',
  ירושלים: 'Jerusalem',
  חיפה: 'Haifa',
  נתניה: 'Netanya',
};

const normalizeLanguageCode = (value) => {
  const normalized = safeText(value).toLowerCase();
  if (normalized.startsWith('he') || normalized.startsWith('iw')) return 'he';
  if (normalized.startsWith('en')) return 'en';
  return 'en';
};

const normalizeHebrewForLookup = (value) => safeText(value)
  .replace(HEBREW_DIACRITICS_RE, '')
  .replace(/[״"]/g, '')
  .replace(/[׳']/g, '');

const toTitleCaseToken = (token) => {
  const normalized = safeText(token);
  if (!normalized) return '';
  if (/^\d/.test(normalized)) return normalized;
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1).toLowerCase()}`;
};

const transliterateHebrewText = (value) => {
  const normalized = safeText(value);
  if (!normalized || !containsHebrew(normalized)) return normalized;
  const normalizedForLookup = normalizeHebrewForLookup(normalized);
  if (PHRASE_TRANSLITERATION_OVERRIDES[normalizedForLookup]) {
    return PHRASE_TRANSLITERATION_OVERRIDES[normalizedForLookup];
  }
  return normalizedForLookup
    .split(/\s+/)
    .map((token) => {
      const tokenForLookup = normalizeHebrewForLookup(token);
      if (!tokenForLookup) return '';
      let output = '';
      for (const char of tokenForLookup) {
        if (HEBREW_TO_LATIN_CHAR_MAP[char]) {
          output += HEBREW_TO_LATIN_CHAR_MAP[char];
        } else if (/[a-z0-9-]/i.test(char)) {
          output += char;
        }
      }
      const compact = output
        .replace(/aa+/g, 'a')
        .replace(/vv+/g, 'v')
        .trim();
      return compact ? toTitleCaseToken(compact) : '';
    })
    .filter(Boolean)
    .join(' ')
    .trim();
};

const pickBestLocalizedValue = ({
  requestedValue = '',
  sourceValue = '',
  englishFallbackValue = '',
  language = 'en',
}) => {
  const requested = safeText(requestedValue);
  const source = safeText(sourceValue);
  const englishFallback = safeText(englishFallbackValue);
  const normalizedLanguage = normalizeLanguageCode(language);

  if (normalizedLanguage === 'he') {
    return requested || source || englishFallback;
  }

  const englishCandidates = [requested, englishFallback, source].filter(Boolean);
  const nonHebrewCandidate = englishCandidates.find((candidate) => !containsHebrew(candidate));
  if (nonHebrewCandidate) return nonHebrewCandidate;
  const transliteratedCandidate = transliterateHebrewText(englishCandidates[0]);
  return transliteratedCandidate || englishCandidates[0] || '';
};

const uniqueNonEmpty = (values = []) => {
  const seen = new Set();
  return values.filter((value) => {
    const normalized = safeText(value);
    if (!normalized) return false;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const getLocalizedAddress = (address = {}, language = 'en') => {
  const sourceAddress = address && typeof address === 'object' ? address : {};
  const normalizedLanguage = normalizeLanguageCode(language);
  const sourceLocalized = sourceAddress.localized && typeof sourceAddress.localized === 'object'
    ? sourceAddress.localized
    : {};
  const requestedLocalization = sourceLocalized[normalizedLanguage] && typeof sourceLocalized[normalizedLanguage] === 'object'
    ? sourceLocalized[normalizedLanguage]
    : {};
  const fallbackLocalization = sourceLocalized.en && typeof sourceLocalized.en === 'object'
    ? sourceLocalized.en
    : {};

  return {
    street: pickBestLocalizedValue({
      requestedValue: requestedLocalization.street,
      sourceValue: sourceAddress.street,
      englishFallbackValue: fallbackLocalization.street,
      language: normalizedLanguage,
    }),
    streetNumber: pickBestLocalizedValue({
      requestedValue: requestedLocalization.streetNumber,
      sourceValue: sourceAddress.streetNumber,
      englishFallbackValue: fallbackLocalization.streetNumber,
      language: normalizedLanguage,
    }),
    neighborhood: pickBestLocalizedValue({
      requestedValue: requestedLocalization.neighborhood,
      sourceValue: sourceAddress.neighborhood,
      englishFallbackValue: fallbackLocalization.neighborhood,
      language: normalizedLanguage,
    }),
    city: pickBestLocalizedValue({
      requestedValue: requestedLocalization.city,
      sourceValue: sourceAddress.city,
      englishFallbackValue: fallbackLocalization.city,
      language: normalizedLanguage,
    }),
    state: pickBestLocalizedValue({
      requestedValue: requestedLocalization.state,
      sourceValue: sourceAddress.state,
      englishFallbackValue: fallbackLocalization.state,
      language: normalizedLanguage,
    }),
    zip: safeText(sourceAddress.zip),
    country: pickBestLocalizedValue({
      requestedValue: requestedLocalization.country,
      sourceValue: sourceAddress.country,
      englishFallbackValue: fallbackLocalization.country,
      language: normalizedLanguage,
    }),
  };
};

export const getAddressFieldVariants = (address = {}, fieldName = 'city') => {
  const sourceAddress = address && typeof address === 'object' ? address : {};
  const sourceLocalized = sourceAddress.localized && typeof sourceAddress.localized === 'object'
    ? sourceAddress.localized
    : {};

  return uniqueNonEmpty([
    safeText(sourceAddress[fieldName]),
    safeText(sourceLocalized.he && sourceLocalized.he[fieldName]),
    safeText(sourceLocalized.en && sourceLocalized.en[fieldName]),
  ]);
};

export const buildAddressQuery = (address = {}, language = 'en') => {
  const normalizedLanguage = normalizeLanguageCode(language);
  const localizedAddress = getLocalizedAddress(address, normalizedLanguage);
  const streetLine = normalizedLanguage === 'en'
    ? [localizedAddress.streetNumber, localizedAddress.street].filter(Boolean).join(' ')
    : [localizedAddress.street, localizedAddress.streetNumber].filter(Boolean).join(' ');
  const country = localizedAddress.country || 'Israel';
  return [streetLine, localizedAddress.neighborhood, localizedAddress.city, localizedAddress.state, country]
    .filter(Boolean)
    .join(', ');
};
