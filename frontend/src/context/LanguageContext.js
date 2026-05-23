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

const normalizeLanguage = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.startsWith('he')) return 'he';
  if (normalized.startsWith('en')) return 'en';
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : DEFAULT_LANGUAGE;
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

const getInitialLanguage = () => {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const fromStorageRaw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const fromStorage = fromStorageRaw ? normalizeLanguage(fromStorageRaw) : '';
  if (SUPPORTED_LANGUAGES.includes(fromStorage)) return fromStorage;
  return normalizeLanguage(window.navigator.language);
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
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = meta.dir;
  }, [language, meta.dir]);

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
