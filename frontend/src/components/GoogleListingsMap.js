import React, { useEffect, useMemo, useRef, useState } from 'react';

const MAP_SCRIPT_ID = 'homekey-google-maps-platform-script';
const GEO_CACHE_KEY = 'homekey:google-geocode-cache:v1';
const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 }; // Tel Aviv
const MAX_MARKERS = 40;
const MIN_CIRCLE_RADIUS_METERS = 80;
const EARTH_RADIUS_METERS = 6371000;
const PAN_STEP_PX = 130;
const METERS_PER_DEGREE_LAT = 111320;
const EARTH_METERS_PER_PIXEL_EQUATOR = 156543.03392;
const OVERLAP_SPREAD_PIXELS = 24;
const MIN_MARKER_SEPARATION_PIXELS = 18;
const MAX_OVERLAP_SHIFT_ATTEMPTS = 40;
const MARKER_STYLE_PRESETS = {
  house: {
    label: 'House Pins',
    markerMode: 'house',
    iconWidth: 19,
    iconHeight: 27,
    pinColor: '#0e8a88',
    pinStrokeColor: '#0f766e',
    homeStrokeColor: '#ffffff',
  },
  minimal: {
    label: 'Minimal',
    markerMode: 'house',
    iconWidth: 16,
    iconHeight: 23,
    pinColor: '#94a3b8',
    pinStrokeColor: '#64748b',
    homeStrokeColor: '#ffffff',
  },
  medium: {
    label: 'Medium',
    markerMode: 'house',
    iconWidth: 19,
    iconHeight: 27,
    pinColor: '#0e8a88',
    pinStrokeColor: '#0f766e',
    homeStrokeColor: '#ffffff',
  },
  bold: {
    label: 'Bold',
    markerMode: 'house',
    iconWidth: 22,
    iconHeight: 31,
    pinColor: '#0f766e',
    pinStrokeColor: '#0f172a',
    homeStrokeColor: '#ecfeff',
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

const getMetersPerPixel = (lat, mapZoom) => {
  const zoom = Number.isFinite(mapZoom) ? Number(mapZoom) : 10;
  const safeCosLat = Math.max(0.2, Math.cos(toRadians(lat)));
  return (EARTH_METERS_PER_PIXEL_EQUATOR * safeCosLat) / (2 ** zoom);
};

const applyMarkerOverlapOffset = (coords, overlapIndex, mapZoom) => {
  if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng) || overlapIndex <= 0) {
    return coords;
  }
  const angleRadians = overlapIndex * 2.399963229728653; // golden angle for radial spacing
  const metersPerPixel = getMetersPerPixel(coords.lat, mapZoom);
  const radiusPixels = OVERLAP_SPREAD_PIXELS * Math.sqrt(overlapIndex);
  const radiusMeters = radiusPixels * metersPerPixel;
  const dLat = (radiusMeters * Math.cos(angleRadians)) / EARTH_RADIUS_METERS;
  const safeCosLat = Math.max(0.2, Math.cos(toRadians(coords.lat)));
  const dLng = (radiusMeters * Math.sin(angleRadians)) / (EARTH_RADIUS_METERS * safeCosLat);
  return {
    lat: coords.lat + ((dLat * 180) / Math.PI),
    lng: coords.lng + ((dLng * 180) / Math.PI),
  };
};

const getMarkerCollisionFreeCoords = (coords, placedCoords, mapZoom) => {
  if (!coords || !Array.isArray(placedCoords) || placedCoords.length === 0) return coords;
  const minSeparationMeters = Math.max(2, MIN_MARKER_SEPARATION_PIXELS * getMetersPerPixel(coords.lat, mapZoom));
  const intersectsAny = (candidate) => placedCoords.some(
    (placed) => getDistanceMeters(candidate, placed) < minSeparationMeters
  );
  if (!intersectsAny(coords)) return coords;

  let fallbackCandidate = coords;
  for (let attempt = 1; attempt <= MAX_OVERLAP_SHIFT_ATTEMPTS; attempt += 1) {
    const candidate = applyMarkerOverlapOffset(coords, attempt, mapZoom);
    fallbackCandidate = candidate;
    if (!intersectsAny(candidate)) return candidate;
  }
  return fallbackCandidate;
};

const getMarkerImageUrl = (property, propertyId) => {
  const propertyImages = property && Array.isArray(property.images) ? property.images : [];
  const firstImage = propertyImages.find((imageUrl) => typeof imageUrl === 'string' && imageUrl.trim());
  if (firstImage) return firstImage.trim();
  return `https://picsum.photos/seed/homekey-map-marker-${encodeURIComponent(String(propertyId || 'listing'))}/120/120`;
};

const getMarkerStylePreset = (presetKey) =>
  MARKER_STYLE_PRESETS[presetKey] || MARKER_STYLE_PRESETS[DEFAULT_MARKER_PRESET_KEY];

const createPhotoMarkerIcon = (mapsApi, imageUrl, preset) => ({
  url: imageUrl,
  scaledSize: new mapsApi.Size(preset.imageSize, preset.imageSize),
  anchor: new mapsApi.Point(preset.imageSize / 2, preset.imageSize / 2),
});

const createPhotoMarkerFrameIcon = (mapsApi, preset) => ({
  path: mapsApi.SymbolPath.CIRCLE,
  scale: preset.frameDiameter / 2,
  fillColor: preset.frameFillColor,
  fillOpacity: preset.frameFillOpacity,
  strokeColor: preset.frameStrokeColor,
  strokeOpacity: 1,
  strokeWeight: preset.frameStrokePx,
});

const createHousePinIcon = (mapsApi, preset) => {
  const iconWidth = Number(preset.iconWidth) || 19;
  const iconHeight = Number(preset.iconHeight) || 27;
  const pinColor = preset.pinColor || '#0e8a88';
  const pinStrokeColor = preset.pinStrokeColor || '#0f766e';
  const homeStrokeColor = preset.homeStrokeColor || '#ffffff';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32">
      <path d="M12 1.2C6.03 1.2 1.2 6.03 1.2 12c0 7.63 8.28 16.98 9.93 18.76.47.52 1.27.52 1.74 0C14.52 28.98 22.8 19.63 22.8 12 22.8 6.03 17.97 1.2 12 1.2Z" fill="${pinColor}" stroke="${pinStrokeColor}" stroke-width="1.4"/>
      <path d="M7.55 13.4 12 9.75l4.45 3.65" fill="none" stroke="${homeStrokeColor}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8.75 13.15v4.75h6.5v-4.75" fill="none" stroke="${homeStrokeColor}" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M11.2 17.9v-2.45h1.6v2.45" fill="none" stroke="${homeStrokeColor}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new mapsApi.Size(iconWidth, iconHeight),
    anchor: new mapsApi.Point(iconWidth / 2, iconHeight - 1),
  };
};

const GoogleListingsMap = ({ properties = [], onCircleSelectionChange, clearSignal = 0 }) => {
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
      const mapZoom = Number(map.getZoom && map.getZoom()) || 10;
      const placedMarkerCoords = [];

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

        const isHousePinPreset = markerPreset.markerMode === 'house';
        const markerCoords = getMarkerCollisionFreeCoords(coords, placedMarkerCoords, mapZoom);
        placedMarkerCoords.push(markerCoords);

        const frameMarker = isHousePinPreset
          ? null
          : new mapsApi.Marker({
            map,
            position: markerCoords,
            icon: createPhotoMarkerFrameIcon(mapsApi, markerPreset),
            clickable: false,
            zIndex: 1,
            optimized: true,
          });

        const markerIcon = isHousePinPreset
          ? createHousePinIcon(mapsApi, markerPreset)
          : createPhotoMarkerIcon(
            mapsApi,
            getMarkerImageUrl(item.property, item.propertyId),
            markerPreset
          );

        const marker = new mapsApi.Marker({
          map,
          position: markerCoords,
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
          frameMarker,
          propertyId: String(item.propertyId),
          coords: markerCoords,
        });
        bounds.extend(markerCoords);
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
      <div className="google-listings-map-toolbar">
        <button
          type="button"
          className={`secondary-btn map-draw-btn ${drawMode ? 'is-active' : ''}`}
          onClick={() => setDrawMode((value) => !value)}
        >
          {drawMode ? 'Drawing mode on (drag on map)' : 'Draw search circle'}
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
