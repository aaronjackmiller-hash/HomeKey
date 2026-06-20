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

// ── POST /api/geocode ──────────────────────────────────────────────────────────
// Public. Body: { street, city, country }
// Returns: { neighborhood, lat, lng, formattedAddress }

exports.geocodeAddress = async (req, res) => {
    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return res.status(503).json({
                success: false,
                message: 'Geocoding is temporarily unavailable. Server is missing GOOGLE_MAPS_API_KEY.',
            });
        }

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

        const response = await fetch(url);
        if (!response.ok) {
            return res.status(502).json({
                success: false,
                message: 'Geocoding service request failed.',
            });
        }

        const data = await response.json();

        if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
            // Not an error — just no match. Frontend falls back to manual entry.
            return res.json({
                success: true,
                neighborhood: null,
                lat: null,
                lng: null,
                formattedAddress: null,
            });
        }

        const topResult = data.results[0];
        const neighborhood = extractNeighborhood(topResult.address_components || []);
        const { lat, lng } = extractCoordinates(topResult.geometry);

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
