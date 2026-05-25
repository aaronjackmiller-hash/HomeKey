import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from 'react';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_META,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  translations,
} from '../i18n/translations';

const LEGACY_LANGUAGE_KEYS = [
  LANGUAGE_STORAGE_KEY,
  'homekeyLanguage',
  'language',
  'i18nextLng',
];

const parseLanguageCandidate = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/_/g, '-');
  if (!normalized) return '';
  if (normalized.startsWith('he') || normalized.startsWith('iw')) return 'he';
  if (normalized.startsWith('en')) return 'en';
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : '';
};

const normalizeLanguage = (value) => {
  const normalized = parseLanguageCandidate(value);
  return normalized || DEFAULT_LANGUAGE;
};

const interpolate = (template, variables = {}) =>
  String(template).replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, key) => {
    const trimmedKey = String(key || '').trim();
    return variables[trimmedKey] != null ? String(variables[trimmedKey]) : '';
  });

const resolveMessageByPath = (bundle, path) => {
  if (!bundle || typeof bundle !== 'object') return undefined;
  return String(path || '')
    .split('.')
    .reduce((accumulator, key) => (accumulator && typeof accumulator === 'object' ? accumulator[key] : undefined), bundle);
};

const getLanguageFromUrl = () => {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search || '');
    const urlCandidates = [
      params.get('lang'),
      params.get('language'),
      params.get('locale'),
      params.get('hl'),
      window.location.pathname.split('/').filter(Boolean)[0] || '',
      String(window.location.hash || '').replace(/^#/, '').split(/[/?&]/)[0] || '',
    ];
    for (const candidate of urlCandidates) {
      const parsed = parseLanguageCandidate(candidate);
      if (parsed) return parsed;
    }
    return '';
  } catch (_err) {
    return '';
  }
};

const getLanguageFromStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) return '';
  try {
    for (const key of LEGACY_LANGUAGE_KEYS) {
      const parsed = parseLanguageCandidate(window.localStorage.getItem(key));
      if (parsed) return parsed;
    }
    return '';
  } catch (_err) {
    return '';
  }
};

const getLanguageFromNavigator = () => {
  if (typeof window === 'undefined' || !window.navigator) return '';
  const navigatorCandidates = [
    ...(Array.isArray(window.navigator.languages) ? window.navigator.languages : []),
    window.navigator.language,
    window.navigator.userLanguage,
  ];
  for (const candidate of navigatorCandidates) {
    const parsed = parseLanguageCandidate(candidate);
    if (parsed) return parsed;
  }
  return '';
};

const getInitialLanguage = () => {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const fromUrl = getLanguageFromUrl();
  if (fromUrl) return fromUrl;
  const fromStorage = getLanguageFromStorage();
  if (fromStorage) return fromStorage;
  const fromDocument = parseLanguageCandidate(document.documentElement.lang);
  if (fromDocument) return fromDocument;
  const fromNavigator = getLanguageFromNavigator();
  if (fromNavigator) return fromNavigator;
  return DEFAULT_LANGUAGE;
};

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  locale: LANGUAGE_META[DEFAULT_LANGUAGE].locale,
  isRtl: false,
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key) => key,
  formatNumber: (value) => Number(value),
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(getInitialLanguage);
  const messages = translations[language] || translations[DEFAULT_LANGUAGE];
  const fallbackMessages = translations[DEFAULT_LANGUAGE];
  const meta = LANGUAGE_META[language] || LANGUAGE_META[DEFAULT_LANGUAGE];

  const setLanguage = useCallback((nextLanguage) => {
    setLanguageState(normalizeLanguage(nextLanguage));
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((current) => (current === 'he' ? 'en' : 'he'));
  }, []);

  const t = useCallback((key, variables = {}) => {
    const resolved = resolveMessageByPath(messages, key) ?? resolveMessageByPath(fallbackMessages, key);
    if (typeof resolved !== 'string') return String(key);
    return interpolate(resolved, variables);
  }, [fallbackMessages, messages]);

  const formatNumber = useCallback((value) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) return String(value);
    return new Intl.NumberFormat(meta.locale).format(parsedValue);
  }, [meta.locale]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (_err) {
      // Ignore storage failures in private/locked down modes.
    }
    document.documentElement.lang = language;
    document.documentElement.dir = meta.dir;
  }, [language, meta.dir]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleStorage = (event) => {
      if (!event || !LEGACY_LANGUAGE_KEYS.includes(event.key)) return;
      setLanguageState(normalizeLanguage(event.newValue));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const contextValue = useMemo(() => ({
    language,
    locale: meta.locale,
    isRtl: meta.dir === 'rtl',
    setLanguage,
    toggleLanguage,
    t,
    formatNumber,
  }), [formatNumber, language, meta.dir, meta.locale, setLanguage, t, toggleLanguage]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
