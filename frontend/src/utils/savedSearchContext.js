const SAVED_SEARCH_CONTEXT_KEY = 'homekey:saved-search-context:v1';

const canUseBrowserStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const readSavedSearchContext = () => {
  if (!canUseBrowserStorage()) return null;
  try {
    const raw = window.localStorage.getItem(SAVED_SEARCH_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_err) {
    return null;
  }
};

export const writeSavedSearchContext = (context) => {
  if (!canUseBrowserStorage() || !context || typeof context !== 'object') return;
  try {
    window.localStorage.setItem(SAVED_SEARCH_CONTEXT_KEY, JSON.stringify(context));
    window.dispatchEvent(new CustomEvent('homekey:saved-search-context-updated', { detail: context }));
  } catch (_err) {
    // Ignore storage errors.
  }
};

export const SAVED_SEARCH_CONTEXT_STORAGE_KEY = SAVED_SEARCH_CONTEXT_KEY;
