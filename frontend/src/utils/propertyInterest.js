const FAVORITE_IDS_KEY = 'homekey:favorite-property-ids:v1';
const SAVED_IDS_KEY = 'homekey:saved-property-ids:v1';
const SAVED_FILE_KEY = 'homekey:saved-property-file:v1';

const getStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
};

const readJson = (key, fallback) => {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_err) {
    return fallback;
  }
};

const writeJson = (key, value) => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (_err) {
    // Ignore storage quota failures.
  }
};

const normalizePropertyId = (propertyOrId) => {
  if (propertyOrId == null) return '';
  if (typeof propertyOrId === 'string' || typeof propertyOrId === 'number') {
    return String(propertyOrId).trim();
  }
  if (typeof propertyOrId === 'object') {
    const value = propertyOrId._id || propertyOrId.id;
    return value == null ? '' : String(value).trim();
  }
  return '';
};

const normalizeIdList = (value) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map((item) => normalizePropertyId(item))
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
};

export const loadFavoriteIds = () => normalizeIdList(readJson(FAVORITE_IDS_KEY, []));

export const loadSavedIds = () => normalizeIdList(readJson(SAVED_IDS_KEY, []));

export const loadSavedPropertyFile = () => {
  const records = readJson(SAVED_FILE_KEY, []);
  if (!Array.isArray(records)) return [];
  return records.filter((record) => record && typeof record === 'object' && normalizePropertyId(record.id));
};

export const isStoredId = (collection, propertyOrId) => {
  const propertyId = normalizePropertyId(propertyOrId);
  if (!propertyId) return false;
  return Array.isArray(collection) && collection.includes(propertyId);
};

export const toggleFavoriteId = (propertyOrId) => {
  const propertyId = normalizePropertyId(propertyOrId);
  if (!propertyId) return loadFavoriteIds();
  const next = new Set(loadFavoriteIds());
  if (next.has(propertyId)) {
    next.delete(propertyId);
  } else {
    next.add(propertyId);
  }
  const nextIds = Array.from(next);
  writeJson(FAVORITE_IDS_KEY, nextIds);
  return nextIds;
};

const buildSavedRecord = (property = {}, meta = {}) => {
  const propertyId = normalizePropertyId(property);
  if (!propertyId) return null;
  const address = property.address && typeof property.address === 'object' ? property.address : {};
  const firstImage = Array.isArray(property.images) ? String(property.images[0] || '').trim() : '';
  return {
    id: propertyId,
    title: String(meta.displayTitle || property.title || '').trim() || 'Property listing',
    location: String(meta.displayLocation || '').trim(),
    type: String(property.type || '').trim(),
    price: property.price != null ? Number(property.price) : null,
    image: firstImage,
    savedAt: new Date().toISOString(),
    address: {
      street: String(address.street || '').trim(),
      streetNumber: String(address.streetNumber || '').trim(),
      city: String(address.city || '').trim(),
      state: String(address.state || '').trim(),
      zip: String(address.zip || '').trim(),
      country: String(address.country || '').trim(),
    },
  };
};

export const toggleSavedProperty = (property = {}, meta = {}) => {
  const propertyId = normalizePropertyId(property);
  if (!propertyId) {
    return {
      saved: false,
      savedIds: loadSavedIds(),
      savedFile: loadSavedPropertyFile(),
    };
  }

  const savedSet = new Set(loadSavedIds());
  let savedFile = loadSavedPropertyFile();
  let saved = false;

  if (savedSet.has(propertyId)) {
    savedSet.delete(propertyId);
    savedFile = savedFile.filter((record) => normalizePropertyId(record.id) !== propertyId);
  } else {
    const record = buildSavedRecord(property, meta);
    if (record) {
      savedSet.add(propertyId);
      saved = true;
      savedFile = [record, ...savedFile.filter((item) => normalizePropertyId(item.id) !== propertyId)];
    }
  }

  const savedIds = Array.from(savedSet);
  writeJson(SAVED_IDS_KEY, savedIds);
  writeJson(SAVED_FILE_KEY, savedFile);

  return { saved, savedIds, savedFile };
};

export const isFavoriteProperty = (propertyOrId) => isStoredId(loadFavoriteIds(), propertyOrId);

export const isSavedProperty = (propertyOrId) => isStoredId(loadSavedIds(), propertyOrId);

export const toggleFavoriteProperty = (propertyOrId) => {
  const nextIds = toggleFavoriteId(propertyOrId);
  const propertyId = normalizePropertyId(propertyOrId);
  return {
    favorite: propertyId ? nextIds.includes(propertyId) : false,
    favoriteIds: nextIds,
  };
};

export const getInterestSummary = () => ({
  favoriteIds: loadFavoriteIds(),
  savedIds: loadSavedIds(),
  savedFile: loadSavedPropertyFile(),
});
