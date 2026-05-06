import React, { useEffect, useMemo, useRef, useState } from 'react';

const MAP_SCRIPT_ID = 'homekey-google-maps-platform-script';
const GEO_CACHE_KEY = 'homekey:google-geocode-cache:v1';
const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 }; // Tel Aviv
const MAX_MARKERS = 40;
const MIN_CIRCLE_RADIUS_METERS = 80;
const EARTH_RADIUS_METERS = 6371000;
const PAN_STEP_PX = 130;
const MARKER_STYLE_PRESETS = {
  house: {
    label: 'House Pins',
    markerMode: 'pricePin',
    minWidth: 56,
    pinHeight: 26,
    pointerHeight: 10,
    horizontalPadding: 10,
    fontSize: 12,
    fontWeight: 700,
    pinColor: '#2563eb',
    pinStrokeColor: '#1d4ed8',
    textColor: '#ffffff',
  },
  minimal: {
    label: 'Minimal',
    markerMode: 'pricePin',
    minWidth: 52,
    pinHeight: 24,
    pointerHeight: 9,
    horizontalPadding: 8,
    fontSize: 11,
    fontWeight: 700,
    pinColor: '#3b82f6',
    pinStrokeColor: '#2563eb',
    textColor: '#ffffff',
  },
  medium: {
    label: 'Medium',
    markerMode: 'pricePin',
    minWidth: 56,
    pinHeight: 26,
    pointerHeight: 10,
    horizontalPadding: 10,
    fontSize: 12,
    fontWeight: 700,
    pinColor: '#2563eb',
    pinStrokeColor: '#1d4ed8',
    textColor: '#ffffff',
  },
  bold: {
    label: 'Bold',
    markerMode: 'pricePin',
    minWidth: 62,
    pinHeight: 28,
    pointerHeight: 11,
    horizontalPadding: 11,
    fontSize: 13,
    fontWeight: 800,
    pinColor: '#1d4ed8',
    pinStrokeColor: '#1e40af',
    textColor: '#ffffff',
  },
};
const DEFAULT_MARKER_PRESET_KEY = 'medium';

let googleMapsLoadPromise;

const safeText = (value) => (typeof value === 'string' ? value.trim() : '');
const getPropertyId = (property) => property && (property._id || property.id);
const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const readGeocodeCache = () => {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(GEO_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_err) {
    return {};
  }
};

const writeGeocodeCache = (cacheObj) => {
  if (typeof window === 'undefined' || !window.localStorage || !cacheObj || typeof cacheObj !== 'object') return;
  try {
    const entries = Object.entries(cacheObj).slice(-500);
    window.localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch (_err) {
    // Ignore localStorage quota errors.
  }
};

const toAddressQuery = (property = {}) => {
  const address = property.address && typeof property.address === 'object' ? property.address : {};
  const street = safeText(address.street);
  const streetNumber = safeText(address.streetNumber);
  const city = safeText(address.city);
  const state = safeText(address.state);
  const country = safeText(address.country) || 'Israel';
  const streetLine = [street, streetNumber].filter(Boolean).join(' ');
  return [streetLine, city, state, country].filter(Boolean).join(', ');
};

const loadGoogleMaps = (apiKey) => {
  if (!apiKey) return Promise.reject(new Error('Missing Google Maps API key.'));
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Maps can only load in the browser.'));
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
  if (googleMapsLoadPromise) return googleMapsLoadPromise;

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(MAP_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google && window.google.maps));
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps script.')));
      return;
    }

    const script = document.createElement('script');
    script.id = MAP_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.onload = () => resolve(window.google && window.google.maps);
    script.onerror = () => reject(new Error('Failed to load Google Maps script.'));
    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
};

const geocodeAddress = (geocoder, address) => new Promise((resolve) => {
  geocoder.geocode({ address }, (results, status) => {
    if (status !== 'OK' || !results || !results[0] || !results[0].geometry || !results[0].geometry.location) {
      resolve(null);
      return;
    }
    const location = results[0].geometry.location;
    resolve({ lat: location.lat(), lng: location.lng() });
  });
});

const toRadians = (value) => (Number(value) * Math.PI) / 180;

const getDistanceMeters = (startPoint, endPoint) => {
  if (!startPoint || !endPoint) return Infinity;
  const lat1 = Number(startPoint.lat);
  const lng1 = Number(startPoint.lng);
  const lat2 = Number(endPoint.lat);
  const lng2 = Number(endPoint.lng);
  if ([lat1, lng1, lat2, lng2].some((value) => Number.isNaN(value))) return Infinity;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getMarkerImageUrl = (property, propertyId) => {
  const propertyImages = property && Array.isArray(property.images) ? property.images : [];
  const firstImage = propertyImages.find((imageUrl) => typeof imageUrl === 'string' && imageUrl.trim());
  if (firstImage) return firstImage.trim();
  return `https://picsum.photos/seed/homekey-map-marker-${encodeURIComponent(String(propertyId || 'listing'))}/120/120`;
};

const getMarkerStylePreset = (presetKey) =>
  MARKER_STYLE_PRESETS[presetKey] || MARKER_STYLE_PRESETS[DEFAULT_MARKER_PRESET_KEY];

const formatMarkerPrice = (price) => {
  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) return 'N/A';
  return `₪${parsedPrice.toLocaleString()}`;
};

const createPricePinIcon = (mapsApi, preset, priceText) => {
  const pinHeight = Number(preset.pinHeight) || 26;
  const pointerHeight = Number(preset.pointerHeight) || 10;
  const horizontalPadding = Number(preset.horizontalPadding) || 10;
  const minWidth = Number(preset.minWidth) || 56;
  const fontSize = Number(preset.fontSize) || 12;
  const fontWeight = Number(preset.fontWeight) || 700;
  const pinColor = preset.pinColor || '#2563eb';
  const pinStrokeColor = preset.pinStrokeColor || '#1d4ed8';
  const textColor = preset.textColor || '#ffffff';
  const safePriceText = escapeHtml(priceText);

  const estimatedTextWidth = Math.ceil(safePriceText.length * fontSize * 0.62);
  const bubbleWidth = Math.max(minWidth, estimatedTextWidth + (horizontalPadding * 2));
  const totalHeight = pinHeight + pointerHeight;
  const radius = Math.round(pinHeight / 2);
  const centerX = bubbleWidth / 2;
  const pointerHalfWidth = Math.max(5, Math.round(bubbleWidth * 0.12));
  const textY = Math.round((pinHeight / 2) + (fontSize * 0.36));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bubbleWidth}" height="${totalHeight}" viewBox="0 0 ${bubbleWidth} ${totalHeight}" overflow="visible">
    <rect x="0.5" y="0.5" width="${bubbleWidth - 1}" height="${pinHeight - 1}" rx="${radius}" fill="${pinColor}" stroke="${pinStrokeColor}" stroke-width="1"/>
    <path d="M${centerX - pointerHalfWidth} ${pinHeight - 1} L${centerX} ${totalHeight - 1} L${centerX + pointerHalfWidth} ${pinHeight - 1} Z" fill="${pinColor}" stroke="${pinStrokeColor}" stroke-width="1" stroke-linejoin="round"/>
    <text x="${centerX}" y="${textY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${textColor}">${safePriceText}</text>
  </svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new mapsApi.Size(bubbleWidth, totalHeight),
    anchor: new mapsApi.Point(centerX, totalHeight),
  };
};

const GoogleListingsMap = ({
  properties = [],
  onCircleSelectionChange,
  clearSignal = 0,
  drawModeToggleSignal = 0,
  onDrawModeChange,
}) => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const infoWindowRef = useRef(null);
  const markerEntriesRef = useRef([]);
  const geocodeCacheRef = useRef(readGeocodeCache());
  const drawListenersRef = useRef([]);
  const activeCircleRef = useRef(null);
  const draftCircleRef = useRef(null);
  const drawStartRef = useRef(null);
  const drawToggleSignalRef = useRef(drawModeToggleSignal);
  const clearSignalInitializedRef = useRef(false);
  const [mapError, setMapError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [markerCount, setMarkerCount] = useState(0);
  const [totalMarkerCount, setTotalMarkerCount] = useState(0);
  const [drawMode, setDrawMode] = useState(false);
  const [circleRadiusMeters, setCircleRadiusMeters] = useState(0);
  const [markerPresetKey, setMarkerPresetKey] = useState(DEFAULT_MARKER_PRESET_KEY);
  const markerPreset = getMarkerStylePreset(markerPresetKey);

  const emitCircleSelection = (nextSelection) => {
    if (typeof onCircleSelectionChange === 'function') {
      onCircleSelectionChange(nextSelection);
    }
  };

  const clearDrawListeners = () => {
    drawListenersRef.current.forEach((listener) => {
      if (!listener) return;
      if (typeof listener.remove === 'function') listener.remove();
      else if (window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.removeListener(listener);
      }
    });
    drawListenersRef.current = [];
  };

  const removeDraftCircle = () => {
    if (draftCircleRef.current) {
      draftCircleRef.current.setMap(null);
      draftCircleRef.current = null;
    }
    drawStartRef.current = null;
  };

  const applyCircleFilter = () => {
    const activeCircle = activeCircleRef.current;
    const center = activeCircle && activeCircle.getCenter ? activeCircle.getCenter() : null;
    const radiusMeters = activeCircle && typeof activeCircle.getRadius === 'function'
      ? Number(activeCircle.getRadius())
      : 0;
    const hasAreaFilter = Boolean(activeCircle && center && radiusMeters > 0);
    const centerPoint = hasAreaFilter ? { lat: center.lat(), lng: center.lng() } : null;
    const selectedPropertyIds = [];
    let visibleMarkers = 0;

    markerEntriesRef.current.forEach((entry) => {
      const isVisible = !hasAreaFilter
        || getDistanceMeters(entry.coords, centerPoint) <= radiusMeters;
      entry.marker.setVisible(isVisible);
      if (entry.frameMarker) entry.frameMarker.setVisible(isVisible);
      if (isVisible) {
        visibleMarkers += 1;
        selectedPropertyIds.push(entry.propertyId);
      }
    });

    setMarkerCount(visibleMarkers);
    setTotalMarkerCount(markerEntriesRef.current.length);
    setCircleRadiusMeters(hasAreaFilter ? radiusMeters : 0);
    emitCircleSelection({
      active: hasAreaFilter,
      propertyIds: selectedPropertyIds,
      radiusMeters: hasAreaFilter ? radiusMeters : 0,
      center: centerPoint,
    });
  };

  const clearCircleFilter = () => {
    removeDraftCircle();
    if (activeCircleRef.current) {
      if (window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(activeCircleRef.current);
      }
      activeCircleRef.current.setMap(null);
      activeCircleRef.current = null;
    }
    setDrawMode(false);
    if (mapRef.current) {
      mapRef.current.setOptions({ draggableCursor: null, draggable: true });
    }
    applyCircleFilter();
  };

  const propertiesWithAddress = useMemo(() => properties
    .map((property) => ({
      property,
      propertyId: getPropertyId(property),
      addressQuery: toAddressQuery(property),
    }))
    .filter((item) => item.property && item.propertyId && item.addressQuery), [properties]);

  useEffect(() => {
    if (typeof onDrawModeChange === 'function') {
      onDrawModeChange(drawMode);
    }
  }, [drawMode, onDrawModeChange]);

  useEffect(() => {
    if (drawModeToggleSignal === drawToggleSignalRef.current) return;
    drawToggleSignalRef.current = drawModeToggleSignal;
    setDrawMode((value) => !value);
  }, [drawModeToggleSignal]);

  useEffect(() => {
    emitCircleSelection({
      active: false,
      propertyIds: [],
      radiusMeters: 0,
      center: null,
    });
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then((mapsApi) => {
        if (cancelled || !mapsApi || !mapContainerRef.current) return;
        if (!mapRef.current) {
          mapRef.current = new mapsApi.Map(mapContainerRef.current, {
            center: DEFAULT_CENTER,
            zoom: 10,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            keyboardShortcuts: true,
            gestureHandling: 'greedy',
            cameraControl: false,
          });
          geocoderRef.current = new mapsApi.Geocoder();
          infoWindowRef.current = new mapsApi.InfoWindow();
        }
        setMapReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setMapError(err.message || 'Unable to load Google Maps.');
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !geocoderRef.current || !window.google || !window.google.maps) return undefined;

    let cancelled = false;

    markerEntriesRef.current.forEach((entry) => {
      entry.marker.setMap(null);
      if (entry.frameMarker) entry.frameMarker.setMap(null);
    });
    markerEntriesRef.current = [];
    setMarkerCount(0);
    setTotalMarkerCount(0);

    const mapsApi = window.google.maps;
    const map = mapRef.current;
    const geocoder = geocoderRef.current;
    const infoWindow = infoWindowRef.current;
    const markerInputs = propertiesWithAddress.slice(0, MAX_MARKERS);

    const updateMarkers = async () => {
      const bounds = new mapsApi.LatLngBounds();
      let placed = 0;
      let cacheChanged = false;

      for (const item of markerInputs) {
        if (cancelled) return;
        const cacheKey = item.addressQuery.toLowerCase();
        let coords = geocodeCacheRef.current[cacheKey];

        if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
          coords = await geocodeAddress(geocoder, item.addressQuery);
          if (!coords) continue;
          geocodeCacheRef.current[cacheKey] = coords;
          cacheChanged = true;
          // Avoid query bursts when many listings are shown.
          await new Promise((resolve) => setTimeout(resolve, 80));
        }

        const markerIcon = createPricePinIcon(
          mapsApi,
          markerPreset,
          formatMarkerPrice(item.property.price)
        );

        const marker = new mapsApi.Marker({
          map,
          position: coords,
          title: safeText(item.property.title) || item.addressQuery,
          icon: markerIcon,
          zIndex: 2,
          optimized: true,
        });

        marker.addListener('click', () => {
          const title = safeText(item.property.title) || 'Property listing';
          const price = item.property.price != null ? `₪${Number(item.property.price).toLocaleString()}` : 'Price unavailable';
          const markerImageUrl = getMarkerImageUrl(item.property, item.propertyId);
          const listingHref = `${window.location.origin}/properties/${encodeURIComponent(String(item.propertyId || ''))}`;
          const safeTitle = escapeHtml(title);
          const safeAddress = escapeHtml(item.addressQuery);
          const safePrice = escapeHtml(price);
          const safeImageUrl = escapeHtml(markerImageUrl);
          const safeListingHref = escapeHtml(listingHref);
          infoWindow.setContent(
            `<div style="min-width:220px">
              <a href="${safeListingHref}" style="display:block;color:inherit;text-decoration:none;">
                <img src="${safeImageUrl}" alt="${safeTitle}" style="display:block;width:100%;height:96px;object-fit:cover;border-radius:8px;margin:0 0 8px;" />
                <strong>${safeTitle}</strong><br />${safePrice}<br /><span>${safeAddress}</span>
                <div style="margin-top:8px;color:#0e8a88;font-weight:700;">View full listing ›</div>
              </a>
            </div>`
          );
          infoWindow.open(map, marker);
        });

        markerEntriesRef.current.push({
          marker,
          frameMarker: null,
          propertyId: String(item.propertyId),
          coords,
        });
        bounds.extend(coords);
        placed += 1;
      }

      if (cacheChanged) writeGeocodeCache(geocodeCacheRef.current);

      if (placed === 1 && markerEntriesRef.current[0]) {
        map.setCenter(markerEntriesRef.current[0].marker.getPosition());
        map.setZoom(13);
      } else if (placed > 1) {
        map.fitBounds(bounds, 42);
      } else {
        map.setCenter(DEFAULT_CENTER);
        map.setZoom(10);
      }

      applyCircleFilter();
    };

    updateMarkers();

    return () => {
      cancelled = true;
      markerEntriesRef.current.forEach((entry) => {
        entry.marker.setMap(null);
        if (entry.frameMarker) entry.frameMarker.setMap(null);
      });
      markerEntriesRef.current = [];
    };
  }, [mapReady, propertiesWithAddress, markerPresetKey]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google || !window.google.maps) return undefined;
    const mapsApi = window.google.maps;
    clearDrawListeners();
    if (!drawMode) {
      if (mapRef.current) mapRef.current.setOptions({ draggableCursor: null, draggable: true });
      return undefined;
    }

    mapRef.current.setOptions({ draggableCursor: 'crosshair', draggable: false });

    const onMouseDown = mapsApi.event.addListener(mapRef.current, 'mousedown', (event) => {
      if (!event || !event.latLng) return;
      removeDraftCircle();
      drawStartRef.current = { lat: event.latLng.lat(), lng: event.latLng.lng() };
      draftCircleRef.current = new mapsApi.Circle({
        map: mapRef.current,
        center: event.latLng,
        radius: MIN_CIRCLE_RADIUS_METERS,
        strokeColor: '#0e8a88',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#0e8a88',
        fillOpacity: 0.12,
        clickable: false,
      });
    });

    const onMouseMove = mapsApi.event.addListener(mapRef.current, 'mousemove', (event) => {
      if (!drawStartRef.current || !draftCircleRef.current || !event || !event.latLng) return;
      const radiusMeters = getDistanceMeters(drawStartRef.current, {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      });
      draftCircleRef.current.setRadius(Math.max(MIN_CIRCLE_RADIUS_METERS, radiusMeters));
    });

    const onMouseUp = mapsApi.event.addListener(mapRef.current, 'mouseup', () => {
      if (!draftCircleRef.current) return;
      if (activeCircleRef.current) {
        mapsApi.event.clearInstanceListeners(activeCircleRef.current);
        activeCircleRef.current.setMap(null);
      }
      activeCircleRef.current = draftCircleRef.current;
      draftCircleRef.current = null;
      drawStartRef.current = null;

      activeCircleRef.current.setOptions({
        clickable: true,
        editable: true,
        draggable: true,
        fillOpacity: 0.16,
      });
      mapsApi.event.addListener(activeCircleRef.current, 'radius_changed', applyCircleFilter);
      mapsApi.event.addListener(activeCircleRef.current, 'center_changed', applyCircleFilter);

      setDrawMode(false);
      mapRef.current.setOptions({ draggableCursor: null, draggable: true });
      applyCircleFilter();
    });

    drawListenersRef.current = [onMouseDown, onMouseMove, onMouseUp];

    return () => {
      clearDrawListeners();
      if (mapRef.current) mapRef.current.setOptions({ draggableCursor: null, draggable: true });
    };
  }, [drawMode, mapReady]);

  useEffect(() => {
    if (!clearSignalInitializedRef.current) {
      clearSignalInitializedRef.current = true;
      return;
    }
    clearCircleFilter();
  }, [clearSignal]);

  useEffect(() => () => {
    clearDrawListeners();
    removeDraftCircle();
    if (activeCircleRef.current) {
      if (window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(activeCircleRef.current);
      }
      activeCircleRef.current.setMap(null);
      activeCircleRef.current = null;
    }
    emitCircleSelection({
      active: false,
      propertyIds: [],
      radiusMeters: 0,
      center: null,
    });
  }, []);

  if (!apiKey) {
    return (
      <div className="google-listings-map-note">
        Set <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> to enable apartment location markers.
      </div>
    );
  }

  if (mapError) {
    return <div className="google-listings-map-note">{mapError}</div>;
  }

  const panMapBy = (x, y) => {
    if (!mapRef.current || typeof mapRef.current.panBy !== 'function') return;
    mapRef.current.panBy(x, y);
  };

  return (
    <div className="google-listings-map-shell">
      <div className="google-listings-map-toolbar">
        <button
          type="button"
          className={`secondary-btn map-draw-btn ${drawMode ? 'is-active' : ''}`}
          onClick={() => setDrawMode((value) => !value)}
        >
          {drawMode ? 'Draw Mode' : 'Draw search circle'}
        </button>
        <button
          type="button"
          className="secondary-btn map-draw-btn"
          onClick={clearCircleFilter}
          disabled={!drawMode && !activeCircleRef.current}
        >
          Clear area
        </button>
        <div className="map-marker-presets" role="group" aria-label="Map marker style presets">
          {Object.entries(MARKER_STYLE_PRESETS).map(([presetKey, presetConfig]) => (
            <button
              key={presetKey}
              type="button"
              className={`secondary-btn map-marker-preset-btn ${markerPresetKey === presetKey ? 'is-active' : ''}`}
              onClick={() => setMarkerPresetKey(presetKey)}
              aria-pressed={markerPresetKey === presetKey}
            >
              {presetConfig.label}
            </button>
          ))}
        </div>
      </div>
      <div className="google-listings-map-canvas-wrap">
        <div ref={mapContainerRef} className="google-listings-map-canvas" />
        <div className="google-listings-map-pan-controls" aria-label="Pan map">
          <button
            type="button"
            className="google-listings-map-pan-btn up"
            onClick={() => panMapBy(0, -PAN_STEP_PX)}
            aria-label="Pan up"
          >
            ▲
          </button>
          <button
            type="button"
            className="google-listings-map-pan-btn left"
            onClick={() => panMapBy(-PAN_STEP_PX, 0)}
            aria-label="Pan left"
          >
            ◀
          </button>
          <button
            type="button"
            className="google-listings-map-pan-btn right"
            onClick={() => panMapBy(PAN_STEP_PX, 0)}
            aria-label="Pan right"
          >
            ▶
          </button>
          <button
            type="button"
            className="google-listings-map-pan-btn down"
            onClick={() => panMapBy(0, PAN_STEP_PX)}
            aria-label="Pan down"
          >
            ▼
          </button>
        </div>
      </div>
      <p className="google-listings-map-caption">
        {circleRadiusMeters > 0
          ? `Showing ${markerCount} of ${totalMarkerCount} mapped listings inside ${(circleRadiusMeters / 1000).toFixed(2)} km.`
          : markerCount > 0
            ? `Showing ${markerCount} mapped listing${markerCount > 1 ? 's' : ''}.`
            : 'Map is ready. Matching listing markers will appear as addresses resolve.'}
      </p>
    </div>
  );
};

export default GoogleListingsMap;
