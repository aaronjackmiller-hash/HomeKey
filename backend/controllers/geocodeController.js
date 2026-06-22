'use strict';

/**
 * geocodeController.js
 *
 * Server-side proxy to Google's Geocoding API. Keeps GOOGLE_MAPS_API_KEY
 * secret-side — never exposed to the browser.
 *
 * Used by the roommate listing wizard to auto-derive neighborhood from
 * street + city, since israelLocations.js only maps city → neighborhoods
 * list, not street-level data.
 */

const GEOCODE_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Extracts the neighborhood from Google's address_components array.
 * Google uses 'sublocality_level_1' or 'sublocality' or 'neighborhood'
 * depending on the region — Israel typically uses sublocality_level_1.
 */
const extractNeighborhood = (addressComponents = []) => {
    const sublocality1 = addressComponents.find((c) => c.types.includes('sublocality_level_1'));
    if (sublocality1) return sublocality1.long_name;

    const sublocality = addressComponents.find((c) => c.types.includes('sublocality'));
    if (sublocality) return sublocality.long_name;

    const neighborhood = addressComponents.find((c) => c.types.includes('neighborhood'));
    if (neighborhood) return neighborhood.long_name;

    return null;
};

const extractCoordinates = (geometry) => {
    const location = geometry?.location;
    if (!location) return { lat: null, lng: null };
    return { lat: location.lat, lng: location.lng };
};

// Many Israeli street addresses don't include sublocality/neighborhood in
// their forward-geocode address_components at all — Google's data for the
// specific street_address match just doesn't tag it, even when Google does
// have that data available. Reverse-geocoding the same coordinates returns
// multiple nested results (street address, route, various political
// boundaries, locality...); scanning all of them for any usable component
// is more robust than filtering by result_type, since a strict type filter
// returns nothing at all if this location isn't tagged with that exact type.
const fetchNeighborhoodViaReverseGeocode = async (lat, lng, apiKey) => {
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    try {
        const url = `${GEOCODE_API_URL}?latlng=${lat},${lng}&key=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        if (data.status !== 'OK' || !Array.isArray(data.results)) return null;
        for (const result of data.results) {
            const found = extractNeighborhood(result.address_components || []);
            if (found) return found;
        }
        return null;
    } catch (err) {
        console.error('[geocode] Reverse geocode (sublocality) lookup failed:', err);
        return null;
    }
};

// ── POST /api/geocode ──────────────────────────────────────────────────────────
// Public. Body: { street, city, country }
// Returns: { neighborhood, lat, lng, formattedAddress }

exports.geocodeAddress = async (req, res) => {
    try {
        // GOOGLE_MAPS_API_KEY is the browser-facing key embedded in the
        // frontend for the Maps JavaScript API widget — it's restricted to
        // HTTP referrers, which Google explicitly rejects for server-to-server
        // calls like this one ("API keys with referer restrictions cannot be
        // used with this API"). GOOGLE_GEOCODING_API_KEY is a separate,
        // unrestricted-by-referrer key scoped to only the Geocoding API,
        // meant for exactly this kind of backend call. Falling back to the
        // old key only as a safety net for environments where the dedicated
        // key hasn't been configured yet.
        const apiKey = process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return res.status(503).json({
                success: false,
                message: 'Geocoding is temporarily unavailable. Server is missing GOOGLE_GEOCODING_API_KEY.',
            });
        }
        // Temporary diagnostic logging — every isolated test of this exact
        // logic has succeeded, yet live requests through the actual wizard
        // still fail. Logging exactly what this specific request used (which
        // env var, and a masked preview of the key) so the next failure shows
        // ground truth instead of another reconstruction attempt.
        const apiKeySource = process.env.GOOGLE_GEOCODING_API_KEY ? 'GOOGLE_GEOCODING_API_KEY' : 'GOOGLE_MAPS_API_KEY (fallback)';
        const apiKeyPreview = `${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (len=${apiKey.length})`;

        const { street, streetNumber, city, country = 'Israel' } = req.body || {};
        const trimmedStreet = String(street || '').trim();
        const trimmedCity = String(city || '').trim();

        if (!trimmedStreet || !trimmedCity) {
            return res.status(400).json({
                success: false,
                message: 'Street and city are required to geocode an address.',
            });
        }

        const addressParts = [
            String(streetNumber || '').trim(),
            trimmedStreet,
            trimmedCity,
            String(country || 'Israel').trim(),
        ].filter(Boolean);
        const addressQuery = addressParts.join(', ');

        const url = `${GEOCODE_API_URL}?address=${encodeURIComponent(addressQuery)}&key=${apiKey}`;

        console.log(
            `[geocode] Request: query="${addressQuery}" keySource=${apiKeySource} keyPreview=${apiKeyPreview} ` +
            `nodeVersion=${process.version} pid=${process.pid}`
        );

        const response = await fetch(url);
        if (!response.ok) {
            return res.status(502).json({
                success: false,
                message: 'Geocoding service request failed.',
            });
        }

        const data = await response.json();

        if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
            // Google's status field explains exactly why (ZERO_RESULTS,
            // REQUEST_DENIED, OVER_QUERY_LIMIT, INVALID_REQUEST...). Logging it
            // server-side instead of discarding it — a real rejection
            // (REQUEST_DENIED, OVER_QUERY_LIMIT) and a genuine zero-result
            // lookup used to look identical to the frontend, which is exactly
            // how this referrer-restriction bug stayed invisible.
            if (data.status !== 'ZERO_RESULTS') {
                console.error(
                    `[geocode] Google Geocoding API returned "${data.status}" for query "${addressQuery}":`,
                    data.error_message || '(no error_message provided)'
                );
            }
            return res.json({
                success: true,
                neighborhood: null,
                lat: null,
                lng: null,
                formattedAddress: null,
            });
        }

        const topResult = data.results[0];
        let neighborhood = extractNeighborhood(topResult.address_components || []);
        const { lat, lng } = extractCoordinates(topResult.geometry);

        if (!neighborhood && typeof lat === 'number' && typeof lng === 'number') {
            neighborhood = await fetchNeighborhoodViaReverseGeocode(lat, lng, apiKey);
            console.log(
                `[geocode] Forward geocode had no neighborhood; reverse-geocode fallback ` +
                `${neighborhood ? `found "${neighborhood}"` : 'also found nothing'}.`
            );
        }

        return res.json({
            success: true,
            neighborhood,
            lat,
            lng,
            formattedAddress: topResult.formatted_address || null,
        });
    } catch (err) {
        console.error('[geocode] geocodeAddress error:', err);
        return res.status(500).json({ success: false, message: 'Failed to geocode address.' });
    }
};
