import React, { useEffect, useMemo, useRef, useState } from 'react';
import ConnectedListingsMapFallback from './ConnectedListingsMapFallback';
import { getPropertyId } from '../utils/propertyIdentity';

const MAP_SCRIPT_ID = 'homekey-google-maps-platform-script';
const GEO_CACHE_KEY = 'homekey:google-geocode-cache:v1';
const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 }; // Tel Aviv
const MAX_MARKERS = 40;
const MIN_CIRCLE_RADIUS_METERS = 80;
const EARTH_RADIUS_METERS = 6371000;
const PAN_STEP_PX = 130;
const BRAND_CHARCOAL = '#1A1A1A';
const MOBILE_OVERLAY_QUERY = '(max-width: 767px)';
const DESKTOP_MARKER_HOVER_SCALE = 1.12;
const FAVORITE_PRICE_PIN_STYLE = {
  pinColor: '#FF0000',
  pinStrokeColor: '#000000',
  strokeWidth: 0.9,
  textColor: '#FFFFFF',
  fontWeight: 700,
};
const MARKER_STYLE_PRESETS = {
  minimal: {
    label: 'Minimal',
    markerMode: 'pricePin',
    minWidth: 46,
    pinHeight: 21,
    pointerHeight: 7,
    horizontalPadding: 7,
    fontSize: 10,
    fontWeight: 600,
    pinColor: BRAND_CHARCOAL,
    pinStrokeColor: BRAND_CHARCOAL,
    textColor: '#ffffff',
  },
  house: {
    label: 'House Pins',
    markerMode: 'house',
    iconWidth: 19,
    iconHeight: 27,
    pinColor: '#2563eb',
    pinStrokeColor: '#1d4ed8',
    homeStrokeColor: '#ffffff',
  },
  medium: {
    label: 'Medium',
    markerMode: 'pricePin',
    minWidth: 52,
    pinHeight: 24,
    pointerHeight: 9,
    horizontalPadding: 8,
    fontSize: 11,
    fontWeight: 600,
    pinColor: '#2b3440',
    pinStrokeColor: '#2b3440',
    textColor: '#ffffff',
  },
  bold: {
    label: 'Bold',
    markerMode: 'pricePin',
    minWidth: 56,
    pinHeight: 26,
    pointerHeight: 10,
    horizontalPadding: 9,
    fontSize: 11,
    fontWeight: 700,
    pinColor: BRAND_CHARCOAL,
    pinStrokeColor: BRAND_CHARCOAL,
    textColor: '#ffffff',
  },
};
const DEFAULT_MARKER_PRESET_KEY = 'minimal';

let googleMapsLoadPromise;

const safeText = (value) => (typeof value === 'string' ? value.trim() : '');
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

const createPricePinIcon = (mapsApi, preset, priceText, scale = 1, styleOverrides = {}) => {
  const pinHeight = Number(preset.pinHeight) || 26;
  const pointerHeight = Number(preset.pointerHeight) || 10;
  const horizontalPadding = Number(preset.horizontalPadding) || 10;
  const minWidth = Number(preset.minWidth) || 56;
  const fontSize = Number(preset.fontSize) || 12;
  const resolvedStyleOverrides = styleOverrides && typeof styleOverrides === 'object' ? styleOverrides : {};
  const fontWeight = Number(resolvedStyleOverrides.fontWeight) || Number(preset.fontWeight) || 700;
  const pinColor = resolvedStyleOverrides.pinColor || preset.pinColor || '#2563eb';
  const pinStrokeColor = resolvedStyleOverrides.pinStrokeColor || preset.pinStrokeColor || '#1d4ed8';
  const strokeWidth = Number(resolvedStyleOverrides.strokeWidth) || 1;
  const textColor = resolvedStyleOverrides.textColor || preset.textColor || '#ffffff';
  const safePriceText = escapeHtml(priceText);

  const estimatedTextWidth = Math.ceil(safePriceText.length * fontSize * 0.62);
  const bubbleWidth = Math.max(minWidth, estimatedTextWidth + (horizontalPadding * 2));
  const totalHeight = pinHeight + pointerHeight;
  const radius = Math.round(pinHeight / 2);
  const centerX = bubbleWidth / 2;
  const pointerHalfWidth = Math.max(5, Math.round(bubbleWidth * 0.12));
  const textY = Math.round((pinHeight / 2) + (fontSize * 0.36));
  const halfStroke = strokeWidth / 2;
  const leftX = halfStroke;
  const rightX = bubbleWidth - halfStroke;
  const topY = halfStroke;
  const bubbleBottomY = pinHeight - halfStroke;
  const tipY = totalHeight - halfStroke;
  const safeRadius = Math.max(1, radius - halfStroke);
  const pointerLeftX = centerX - pointerHalfWidth;
  const pointerRightX = centerX + pointerHalfWidth;
  const pinPath = [
    `M${leftX + safeRadius} ${topY}`,
    `H${rightX - safeRadius}`,
    `Q${rightX} ${topY} ${rightX} ${topY + safeRadius}`,
    `V${bubbleBottomY - safeRadius}`,
    `Q${rightX} ${bubbleBottomY} ${rightX - safeRadius} ${bubbleBottomY}`,
    `Q${pointerRightX} ${bubbleBottomY} ${centerX} ${tipY}`,
    `Q${pointerLeftX} ${bubbleBottomY} ${leftX + safeRadius} ${bubbleBottomY}`,
    `Q${leftX} ${bubbleBottomY} ${leftX} ${bubbleBottomY - safeRadius}`,
    `V${topY + safeRadius}`,
    `Q${leftX} ${topY} ${leftX + safeRadius} ${topY}`,
    'Z',
  ].join(' ');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bubbleWidth}" height="${totalHeight}" viewBox="0 0 ${bubbleWidth} ${totalHeight}" overflow="visible">
    <path d="${pinPath}" fill="${pinColor}" stroke="${pinStrokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>
    <text x="${centerX}" y="${textY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${textColor}">${safePriceText}</text>
  </svg>`;

  const safeScale = Number(scale) > 0 ? Number(scale) : 1;
  const scaledWidth = bubbleWidth * safeScale;
  const scaledHeight = totalHeight * safeScale;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new mapsApi.Size(scaledWidth, scaledHeight),
    anchor: new mapsApi.Point(centerX * safeScale, totalHeight * safeScale),
  };
};

const createHousePinIcon = (mapsApi, preset) => {
  const iconWidth = Number(preset.iconWidth) || 19;
  const iconHeight = Number(preset.iconHeight) || 27;
  const pinColor = preset.pinColor || '#0e8a88';
  const pinStrokeColor = preset.pinStrokeColor || '#0f766e';
  const homeStrokeColor = preset.homeStrokeColor || '#ffffff';
  const centerX = iconWidth / 2;
  const roofTop = 1;
  const eaveY = Math.round(iconHeight * 0.4);
  const wallLeft = Math.round(iconWidth * 0.16);
  const wallRight = Math.round(iconWidth * 0.84);
  const doorW = Math.round(iconWidth * 0.32);
  const doorH = Math.round(iconHeight * 0.3);
  const doorX = Math.round(centerX - doorW / 2);
  const doorY = iconHeight - doorH;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconWidth}" height="${iconHeight}" viewBox="0 0 ${iconWidth} ${iconHeight}" overflow="visible">
    <path d="M${centerX} ${roofTop} L0 ${eaveY} H${wallLeft} V${iconHeight} H${wallRight} V${eaveY} H${iconWidth} Z" fill="${pinColor}" stroke="${pinStrokeColor}" stroke-width="1" stroke-linejoin="round" stroke-linecap="round"/>
    <rect x="${doorX}" y="${doorY}" width="${doorW}" height="${doorH}" fill="${homeStrokeColor}" rx="0.5"/>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new mapsApi.Size(iconWidth, iconHeight),
    anchor: new mapsApi.Point(centerX, iconHeight),
  };
};

const isCoarsePointerDevice = () => {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) {
    return true;
  }
  const touchPoints = typeof navigator !== 'undefined' ? Number(navigator.maxTouchPoints) : 0;
  return 'ontouchstart' in window || touchPoints > 0;
};

const GoogleListingsMap = ({
  properties = [],
  favoritePropertyIds = [],
  onCircleSelectionChange,
  clearSignal = 0,
  drawModeToggleSignal = 0,
  onDrawModeChange,
  isVisible = true,
}) => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const infoWindowRef = useRef(null);
  const markerEntriesRef = useRef([]);
  const markerHydrationInProgressRef = useRef(false);
  const expectedMarkerCountRef = useRef(0);
  const geocodeCacheRef = useRef(readGeocodeCache());
  const drawListenersRef = useRef([]);
  const activeCircleRef = useRef(null);
  const draftCircleRef = useRef(null);
  const drawStartRef = useRef(null);
  const lastDraftPointerRef = useRef(null);
  const lastCompletionTimestampRef = useRef(0);
  const drawToggleSignalRef = useRef(drawModeToggleSignal);
  const clearSignalInitializedRef = useRef(false);
  const [mapError, setMapError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [markerCount, setMarkerCount] = useState(0);
  const [totalMarkerCount, setTotalMarkerCount] = useState(0);
  const [drawMode, setDrawMode] = useState(false);
  const [circleRadiusMeters, setCircleRadiusMeters] = useState(0);
  const [mobileMoveCircleMode, setMobileMoveCircleMode] = useState(false);
  const markerPresetKey = DEFAULT_MARKER_PRESET_KEY;
  const [isMobileOverlay, setIsMobileOverlay] = useState(false);
  const [isOverlayCollapsed, setIsOverlayCollapsed] = useState(false);
  const markerPreset = getMarkerStylePreset(markerPresetKey);
  const favoritePropertyIdSet = useMemo(
    () => new Set(favoritePropertyIds.map((id) => String(id))),
    [favoritePropertyIds]
  );

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
    lastDraftPointerRef.current = null;
  };

  const applyCircleFilter = () => {
    const activeCircle = activeCircleRef.current;
    const center = activeCircle && activeCircle.getCenter ? activeCircle.getCenter() : null;
    const radiusMeters = activeCircle && typeof activeCircle.getRadius === 'function'
      ? Number(activeCircle.getRadius())
      : 0;
    const hasAreaFilter = Boolean(activeCircle && center && radiusMeters > 0);
    const hydratedMarkerCount = markerEntriesRef.current.length;
    const shouldDeferSelection = hasAreaFilter
      && markerHydrationInProgressRef.current
      && expectedMarkerCountRef.current > 0
      && hydratedMarkerCount < expectedMarkerCountRef.current;
    const effectiveAreaFilter = hasAreaFilter && !shouldDeferSelection;
    const centerPoint = effectiveAreaFilter ? { lat: center.lat(), lng: center.lng() } : null;
    const selectedPropertyIds = [];
    let visibleMarkers = 0;

    markerEntriesRef.current.forEach((entry) => {
      const isVisible = !effectiveAreaFilter
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
    setCircleRadiusMeters(effectiveAreaFilter ? radiusMeters : 0);
    emitCircleSelection({
      active: effectiveAreaFilter,
      propertyIds: selectedPropertyIds,
      radiusMeters: effectiveAreaFilter ? radiusMeters : 0,
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
    setMobileMoveCircleMode(false);
    if (mapRef.current) {
      mapRef.current.setOptions({
        draggableCursor: null,
        draggable: true,
        gestureHandling: 'greedy',
        disableDoubleClickZoom: false,
      });
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
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const mediaQuery = window.matchMedia(MOBILE_OVERLAY_QUERY);
    const syncOverlayMode = (eventLike) => {
      const matches = Boolean(eventLike && eventLike.matches);
      setIsMobileOverlay(matches);
      setIsOverlayCollapsed(matches);
    };

    syncOverlayMode(mediaQuery);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncOverlayMode);
      return () => mediaQuery.removeEventListener('change', syncOverlayMode);
    }
    mediaQuery.addListener(syncOverlayMode);
    return () => mediaQuery.removeListener(syncOverlayMode);
  }, []);

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
    markerHydrationInProgressRef.current = true;
    expectedMarkerCountRef.current = markerInputs.length;
    const supportsDesktopHover = typeof window.matchMedia === 'function'
      && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    applyCircleFilter();

    const updateMarkers = async () => {
      const bounds = new mapsApi.LatLngBounds();
      let placed = 0;
      let cacheChanged = false;

      for (const item of markerInputs) {
        if (cancelled) {
          markerHydrationInProgressRef.current = false;
          return;
        }
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

        const propertyId = String(item.propertyId);
        const isFavoriteProperty = favoritePropertyIdSet.has(propertyId);
        const markerStyleOverrides = isFavoriteProperty ? FAVORITE_PRICE_PIN_STYLE : {};
        const markerPrice = formatMarkerPrice(item.property.price);
        const isHousePinPreset = markerPreset.markerMode === 'house';
        const markerIcon = isHousePinPreset
          ? createHousePinIcon(mapsApi, markerPreset)
          : createPricePinIcon(
            mapsApi,
            markerPreset,
            markerPrice,
            1,
            markerStyleOverrides
          );
        const markerHoverIcon = supportsDesktopHover
          && !isHousePinPreset
          ? createPricePinIcon(
            mapsApi,
            markerPreset,
            markerPrice,
            DESKTOP_MARKER_HOVER_SCALE,
            markerStyleOverrides
          )
          : null;

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
        if (markerHoverIcon) {
          marker.addListener('mouseover', () => {
            marker.setIcon(markerHoverIcon);
          });
          marker.addListener('mouseout', () => {
            marker.setIcon(markerIcon);
          });
        }

        markerEntriesRef.current.push({
          marker,
          frameMarker: null,
          propertyId,
          coords,
        });
        if (activeCircleRef.current) applyCircleFilter();
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

      markerHydrationInProgressRef.current = false;
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
      markerHydrationInProgressRef.current = false;
      expectedMarkerCountRef.current = 0;
    };
  }, [mapReady, propertiesWithAddress, markerPreset, favoritePropertyIdSet]);

  useEffect(() => {
    if (!isVisible || !mapReady || !mapRef.current || !window.google || !window.google.maps) return undefined;
    const mapsApi = window.google.maps;
    const rafId = window.requestAnimationFrame(() => {
      mapsApi.event.trigger(mapRef.current, 'resize');
      if (markerEntriesRef.current.length === 1 && markerEntriesRef.current[0]) {
        mapRef.current.setCenter(markerEntriesRef.current[0].marker.getPosition());
        mapRef.current.setZoom(13);
      } else if (markerEntriesRef.current.length > 1) {
        const bounds = new mapsApi.LatLngBounds();
        markerEntriesRef.current.forEach((entry) => bounds.extend(entry.coords));
        mapRef.current.fitBounds(bounds, 42);
      } else {
        mapRef.current.setCenter(DEFAULT_CENTER);
        mapRef.current.setZoom(10);
      }
      applyCircleFilter();
    });
    return () => {
      if (typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isVisible, mapReady, totalMarkerCount]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google || !window.google.maps) return undefined;
    const mapsApi = window.google.maps;
    const touchLikeDrawMode = isMobileOverlay || isCoarsePointerDevice();
    clearDrawListeners();
    if (!drawMode) {
      removeDraftCircle();
      if (mapRef.current) {
        mapRef.current.setOptions({
          draggableCursor: null,
          draggable: true,
          gestureHandling: 'greedy',
          disableDoubleClickZoom: false,
        });
      }
      return undefined;
    }

    mapRef.current.setOptions({
      draggableCursor: null,
      draggable: false,
      gestureHandling: touchLikeDrawMode ? 'greedy' : 'none',
      disableDoubleClickZoom: true,
    });

    const getEventPoint = (event) => {
      if (!event || !event.latLng) return null;
      const latValue = event.latLng;
      const lat = typeof latValue.lat === 'function' ? Number(latValue.lat()) : Number(latValue.lat);
      const lng = typeof latValue.lng === 'function' ? Number(latValue.lng()) : Number(latValue.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng, latLng: event.latLng };
    };

    const startDraftCircle = (point) => {
      if (!point) return;
      removeDraftCircle();
      drawStartRef.current = { lat: point.lat, lng: point.lng };
      lastDraftPointerRef.current = { lat: point.lat, lng: point.lng };
      draftCircleRef.current = new mapsApi.Circle({
        map: mapRef.current,
        center: point.latLng || { lat: point.lat, lng: point.lng },
        radius: MIN_CIRCLE_RADIUS_METERS,
        strokeColor: '#0e8a88',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#0e8a88',
        fillOpacity: 0.12,
        clickable: false,
      });
    };

    const updateDraftCircleRadius = (point) => {
      if (!point || !drawStartRef.current || !draftCircleRef.current) return;
      const radiusMeters = getDistanceMeters(drawStartRef.current, { lat: point.lat, lng: point.lng });
      draftCircleRef.current.setRadius(Math.max(MIN_CIRCLE_RADIUS_METERS, radiusMeters));
      lastDraftPointerRef.current = { lat: point.lat, lng: point.lng };
    };

    const completeDraftCircle = (event) => {
      const point = getEventPoint(event);
      if (point) updateDraftCircleRadius(point);
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
      mapRef.current.setOptions({
        draggableCursor: null,
        draggable: true,
        gestureHandling: 'greedy',
        disableDoubleClickZoom: false,
      });
      lastCompletionTimestampRef.current = Date.now();
      applyCircleFilter();
    };

    const handleTapFallback = (event) => {
      if (Date.now() - lastCompletionTimestampRef.current < 250) return;
      const point = getEventPoint(event);
      if (!point) return;
      if (!drawStartRef.current || !draftCircleRef.current) {
        startDraftCircle(point);
        return;
      }
      completeDraftCircle(event);
    };

    const handlePointerDown = (event) => {
      const point = getEventPoint(event);
      if (!point) return;
      startDraftCircle(point);
    };

    const handlePointerMove = (event) => {
      const point = getEventPoint(event);
      if (!point) return;
      updateDraftCircleRadius(point);
    };

    const registerDrawListener = (eventName, handler) => {
      try {
        return mapsApi.event.addListener(mapRef.current, eventName, handler);
      } catch (_err) {
        return null;
      }
    };

    if (touchLikeDrawMode) {
      // In touch mode, complete only on explicit second tap to avoid one-tap min-radius circles.
      const onTouchMove = registerDrawListener('touchmove', handlePointerMove);
      const onTapFallback = registerDrawListener('click', handleTapFallback);
      const onMouseMove = registerDrawListener('mousemove', handlePointerMove);
      drawListenersRef.current = [
        onTouchMove,
        onTapFallback,
        onMouseMove,
      ].filter(Boolean);
    } else {
      const onMouseDown = registerDrawListener('mousedown', handlePointerDown);
      const onMouseMove = registerDrawListener('mousemove', handlePointerMove);
      const onMouseUp = registerDrawListener('mouseup', completeDraftCircle);
      drawListenersRef.current = [onMouseDown, onMouseMove, onMouseUp].filter(Boolean);
    }

    return () => {
      clearDrawListeners();
      if (mapRef.current) {
        mapRef.current.setOptions({
          draggableCursor: null,
          draggable: true,
          gestureHandling: 'greedy',
          disableDoubleClickZoom: false,
        });
      }
    };
  }, [drawMode, isMobileOverlay, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google || !window.google.maps) return undefined;
    if (
      !mobileMoveCircleMode
      || drawMode
      || !activeCircleRef.current
      || (!isMobileOverlay && !isCoarsePointerDevice())
    ) return undefined;
    const mapsApi = window.google.maps;
    const onMapTapToMove = mapsApi.event.addListener(mapRef.current, 'click', (event) => {
      if (!event || !event.latLng || !activeCircleRef.current) return;
      activeCircleRef.current.setCenter(event.latLng);
      setMobileMoveCircleMode(false);
      applyCircleFilter();
    });
    return () => {
      if (!onMapTapToMove) return;
      if (typeof onMapTapToMove.remove === 'function') onMapTapToMove.remove();
      else mapsApi.event.removeListener(onMapTapToMove);
    };
  }, [drawMode, isMobileOverlay, mapReady, mobileMoveCircleMode]);

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
      <ConnectedListingsMapFallback
        properties={properties}
        favoritePropertyIds={favoritePropertyIds}
        onCircleSelectionChange={onCircleSelectionChange}
        clearSignal={clearSignal}
        drawModeToggleSignal={drawModeToggleSignal}
        onDrawModeChange={onDrawModeChange}
        isVisible={isVisible}
      />
    );
  }

  if (mapError) {
    return (
      <ConnectedListingsMapFallback
        properties={properties}
        favoritePropertyIds={favoritePropertyIds}
        onCircleSelectionChange={onCircleSelectionChange}
        clearSignal={clearSignal}
        drawModeToggleSignal={drawModeToggleSignal}
        onDrawModeChange={onDrawModeChange}
        isVisible={isVisible}
      />
    );
  }

  const toggleDrawMode = () => {
    setMobileMoveCircleMode(false);
    setDrawMode((value) => {
      const nextValue = !value;
      if (mapRef.current) {
        mapRef.current.setOptions(nextValue
          ? {
            draggableCursor: null,
            draggable: false,
            gestureHandling: 'none',
            disableDoubleClickZoom: true,
          }
          : {
            draggableCursor: null,
            draggable: true,
            gestureHandling: 'greedy',
            disableDoubleClickZoom: false,
          });
      }
      return nextValue;
    });
  };

  const panMapBy = (x, y) => {
    if (!mapRef.current || typeof mapRef.current.panBy !== 'function') return;
    mapRef.current.panBy(x, y);
  };
  const coarsePointerDevice = isCoarsePointerDevice();
  const touchLikeUiMode = isMobileOverlay || coarsePointerDevice;

  return (
    <div className="google-listings-map-shell">
      <div className={`google-listings-map-overlay-info ${isOverlayCollapsed ? 'is-collapsed' : ''}`}>
        <header className="google-listings-map-header">
          {isMobileOverlay ? (
            <div className="google-listings-map-header-top">
              <button
                type="button"
                className="secondary-btn google-listings-map-collapse-btn"
                onClick={() => setIsOverlayCollapsed((value) => !value)}
              >
                {isOverlayCollapsed ? 'Expand' : 'Collapse'}
              </button>
            </div>
          ) : null}
          {!isOverlayCollapsed ? (
            <div className="google-listings-map-copy-block">
              <h2>Find Your Next Home.</h2>
              <p>Your perfect neighborhood is just a circle away.</p>
            </div>
          ) : null}
        </header>
        {!isOverlayCollapsed ? (
          <div className="google-listings-map-toolbar">
            <button
              type="button"
              className={`secondary-btn map-draw-btn ${drawMode ? 'is-active' : ''}`}
              onClick={toggleDrawMode}
            >
              {drawMode
                ? (touchLikeUiMode ? 'Tap center, then edge' : 'Draw Mode')
                : 'Draw search circle'}
            </button>
            {touchLikeUiMode && !drawMode && activeCircleRef.current ? (
              <button
                type="button"
                className={`secondary-btn map-draw-btn ${mobileMoveCircleMode ? 'is-active' : ''}`}
                onClick={() => setMobileMoveCircleMode((value) => !value)}
              >
                {mobileMoveCircleMode ? 'Tap map to place area' : 'Move circle'}
              </button>
            ) : null}
            <button
              type="button"
              className="secondary-btn map-draw-btn"
              onClick={clearCircleFilter}
              disabled={!drawMode && !activeCircleRef.current}
            >
              Clear Area
            </button>
          </div>
        ) : null}
      </div>
      <div className="google-listings-map-canvas-wrap">
        <div
          ref={mapContainerRef}
          className={`google-listings-map-canvas map-viewport ${drawMode ? 'is-drawing' : ''}`}
        />
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
        {drawMode && touchLikeUiMode
          ? 'Tap once for center, then tap again on the edge to apply the area.'
          : circleRadiusMeters > 0
          ? `Showing ${markerCount} of ${totalMarkerCount} mapped listings inside ${(circleRadiusMeters / 1000).toFixed(2)} km.`
          : markerCount > 0
            ? `Showing ${markerCount} mapped listing${markerCount > 1 ? 's' : ''}.`
            : 'Map is ready. Matching listing markers will appear as addresses resolve.'}
      </p>
    </div>
  );
};

export default GoogleListingsMap;
