const INVALID_OBJECT_STRING = '[object Object]';

const normalizeIdValue = (value) => {
  if (value == null) return '';

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
    return String(value).trim();
  }

  if (typeof value === 'object') {
    if (typeof value.$oid === 'string') return value.$oid.trim();
    if (typeof value.oid === 'string') return value.oid.trim();
    if (typeof value.toHexString === 'function') {
      const hex = String(value.toHexString() || '').trim();
      if (hex) return hex;
    }
    if (Object.prototype.hasOwnProperty.call(value, '_id')) {
      const nestedId = normalizeIdValue(value._id);
      if (nestedId) return nestedId;
    }
    if (Object.prototype.hasOwnProperty.call(value, 'id')) {
      const nestedId = normalizeIdValue(value.id);
      if (nestedId) return nestedId;
    }
  }

  const fromToString = String(value).trim();
  if (!fromToString || fromToString === INVALID_OBJECT_STRING) return '';
  return fromToString;
};

export const getPropertyId = (property = {}) => {
  if (!property || typeof property !== 'object') return '';
  return normalizeIdValue(property._id)
    || normalizeIdValue(property.id)
    || normalizeIdValue(property.externalId);
};

export default getPropertyId;
