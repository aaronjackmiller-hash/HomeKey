/**
 * logRoommateDemand.js
 *
 * Fires a demand signal when a searcher clicks a roommate listing card.
 * The signal is based entirely on the listing's location — not the searcher's.
 *
 * Backend endpoint: POST /api/roommates/demand
 * TODO: implement the backend route that receives and aggregates these signals
 *       into heatmap-ready cluster data (grouped by neighborhood/city).
 */

const DEMAND_ENDPOINT = '/api/roommates/demand';

/**
 * Extracts the best available location payload from a property object.
 * Prefers explicit lat/lng, falls back to address fields.
 */
const extractLocationPayload = (property = {}) => {
  const address = property.address && typeof property.address === 'object'
    ? property.address
    : {};

  const lat = property.lat ?? property.latitude ?? address.lat ?? address.latitude ?? null;
  const lng = property.lng ?? property.longitude ?? address.lng ?? address.longitude ?? null;

  return {
    propertyId: String(property._id || property.id || '').trim() || null,
    city: String(address.city || '').trim() || null,
    neighborhood: String(address.neighborhood || '').trim() || null,
    lat: lat != null ? Number(lat) : null,
    lng: lng != null ? Number(lng) : null,
  };
};

/**
 * Call this when a searcher clicks a roommate listing card.
 * Fire-and-forget — never blocks the UI, never throws.
 *
 * @param {object} property  The full property object from the listing card
 */
export const logRoommateDemandSignal = (property = {}) => {
  if (!property || typeof property !== 'object') return;

  const payload = extractLocationPayload(property);

  // Must have at least a city or coordinates to be useful
  if (!payload.city && (payload.lat == null || payload.lng == null)) return;

  // Fire and forget — intentionally not awaited
  fetch(DEMAND_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Silently swallow — demand logging is best-effort only.
    // A failed signal is never worth surfacing to the user.
  });
};

