import React, { useEffect, useMemo, useRef, useState } from 'react';
import ConnectedListingsMapFallback from './ConnectedListingsMapFallback';
import { getPropertyId } from '../utils/propertyIdentity';
import { useLanguage } from '../context/LanguageContext';
import { buildAddressQuery } from '../utils/addressLocalization';

const MAP_SCRIPT_ID = 'homekey-google-maps-platform-script';
const GEO_CACHE_KEY = 'homekey:google-geocode-cache:v1';
const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 }; // Tel Aviv
const MAX_MARKERS = 40;
const MIN_CIRCLE_RADIUS_METERS = 80;
const EARTH_RADIUS_METERS = 6371000;
const ZOOM_STEP = 1;
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
const DEFAULT_MAP_LANGUAGE = 'en';
const MAP_LANGUAGE_SET = new Set(['en', 'he']);

let googleMapsLoadPromise;
let googleMapsLoadedLanguage = null;
let googleMapsRequestedLanguage = null;

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

const resolveMapLanguage = (language) => (MAP_LANGUAGE_SET.has(language) ? language : DEFAULT_MAP_LANGUAGE);

const loadGoogleMaps = (apiKey, requestedLanguage = DEFAULT_MAP_LANGUAGE) => {
  if (!apiKey) return Promise.reject(new Error('Missing Google Maps API key.'));
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Maps can only load in the browser.'));
  const mapLanguage = resolveMapLanguage(requestedLanguage);
  if (window.google && window.google.maps && googleMapsLoadedLanguage === mapLanguage) {
    return Promise.resolve(window.google.maps);
  }
  if (googleMapsLoadPromise && googleMapsRequestedLanguage === mapLanguage) return googleMapsLoadPromise;

  if (googleMapsLoadedLanguage && googleMapsLoadedLanguage !== mapLanguage) {
    const existingScript = document.getElementById(MAP_SCRIPT_ID);
    if (existingScript && existingScript.parentNode) {
      existingScript.parentNode.removeChild(existingScript);
    }
    if (window.google) {
      try {
        delete window.google;
      } catch (_err) {
        window.google = undefined;
      }
    }
    googleMapsLoadedLanguage = null;
    googleMapsLoadPromise = undefined;
  }

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    googleMapsRequestedLanguage = mapLanguage;
    const existingScript = document.getElementById(MAP_SCRIPT_ID);
    const desiredLanguageParam = `language=${encodeURIComponent(mapLanguage)}`;

    if (existingScript) {
      const existingSrc = String(existingScript.getAttribute('src') || '');
      const hasMatchingLanguage = existingSrc.includes(desiredLanguageParam);
      if (hasMatchingLanguage) {
        if (window.google && window.google.maps) {
          googleMapsLoadedLanguage = mapLanguage;
          googleMapsRequestedLanguage = null;
          resolve(window.google.maps);
          return;
        }
        existingScript.addEventListener('load', () => {
          googleMapsLoadedLanguage = mapLanguage;
          googleMapsRequestedLanguage = null;
          resolve(window.google && window.google.maps);
        });
        existingScript.addEventListener('error', () => {
          googleMapsRequestedLanguage = null;
          reject(new Error('Failed to load Google Maps script.'));
        });
        return;
      }
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = MAP_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&language=${encodeURIComponent(mapLanguage)}&region=IL`;
    script.onload = () => {
      googleMapsLoadedLanguage = mapLanguage;
      googleMapsRequestedLanguage = null;
      resolve(window.google && window.google.maps);
    };
    script.onerror = () => {
      googleMapsRequestedLanguage = null;
      reject(new Error('Failed to load Google Maps script.'));
    };
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

const formatMarkerPrice = (price, locale = 'en-US', unavailableLabel = 'N/A') => {
  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) return unavailableLabel;
  return `₪${parsedPrice.toLocaleString(locale)}`;
};

const toMarkerRoomCount = (property = {}) => {
  const candidates = [property.rooms, property.bedrooms, property.roomCount];
  for (const candidate of candidates) {
    const asNumber = Number(candidate);
    if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
  }
  return null;
};

const buildMarkerDetailLine = (property = {}, addressQuery = '') => {
  const roomCount = toMarkerRoomCount(property);
  const roomLabel = roomCount ? `${roomCount} Rooms` : '';
  const neighborhood = safeText(property?.address?.city || property?.neighborhood || addressQuery.split(',')[0]);
  const neighborhoodLabel = neighborhood ? neighborhood.toUpperCase() : '';
  return [roomLabel, neighborhoodLabel].filter(Boolean).join(' • ');
};

const createListingMarkerElement = (priceText, details = {}, isFavorite = false) => {
  if (typeof document === 'undefined') return null;
  const markerDetails = details && typeof details === 'object' ? details : {};
  const markerElement = document.createElement('div');
  markerElement.className = 'map-listing-marker';
  if (isFavorite) markerElement.classList.add('is-favorite');
  const markerPin = document.createElement('span');
  markerPin.className = 'map-listing-marker-pin';
  markerPin.textContent = priceText;
  const markerPulseRing = document.createElement('span');
  markerPulseRing.className = 'radar-pulse-ring';
  markerPin.appendChild(markerPulseRing);
  markerElement.appendChild(markerPin);
  const markerCaption = document.createElement('div');
  markerCaption.className = 'map-hovered-listing-caption animate-fadeIn';
  const markerCaptionTitle = document.createElement('p');
  markerCaptionTitle.className = 'map-hovered-listing-caption__title';
  markerCaptionTitle.textContent = safeText(markerDetails.title) || 'Listing';
  const markerCaptionMeta = document.createElement('p');
  markerCaptionMeta.className = 'map-hovered-listing-caption__meta';
  markerCaptionMeta.textContent = safeText(markerDetails.detailLine) || priceText;
  markerCaption.appendChild(markerCaptionTitle);
  markerCaption.appendChild(markerCaptionMeta);
  markerElement.appendChild(markerCaption);
  return markerElement;
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
  const supportsMatchMedia = typeof window.matchMedia === 'function';
  const hasFinePointer = supportsMatchMedia && window.matchMedia('(any-pointer: fine)').matches;
  const primaryCoarsePointer = supportsMatchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (hasFinePointer) return false;
  if (primaryCoarsePointer) return true;
  const touchPoints = typeof navigator !== 'undefined' ? Number(navigator.maxTouchPoints) : 0;
  const hasHoverPointer = supportsMatchMedia && window.matchMedia('(hover: hover)').matches;
  return touchPoints > 0 && !hasHoverPointer;
};

const GoogleListingsMap = ({
  properties = [],
  searchResultCount = null,
  favoritePropertyIds = [],
  onCircleSelectionChange,
  clearSignal = 0,
  drawModeToggleSignal = 0,
  onDrawModeChange,
  isVisible = true,
  hoveredListingId = null,
}) => {
  const { t, locale, language } = useLanguage();
  const mapLanguage = language === 'he' ? 'he' : 'en';
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const infoWindowRef = useRef(null);
  const markerEntriesRef = useRef([]);
  const markerHydrationInProgressRef = useRef(false);
  const expectedMarkerCountRef = useRef(0);
  const hasInitializedViewportRef = useRef(false);
  const geocodeCacheRef = useRef(readGeocodeCache());
  const drawListenersRef = useRef([]);
  const activeCircleRef = useRef(null);
  const draftCircleRef = useRef(null);
  const hoveredListingIdRef = useRef(hoveredListingId);
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
  const markerPresetKey = DEFAULT_MARKER_PRESET_KEY;
  const [isMobileOverlay, setIsMobileOverlay] = useState(false);
  const [isOverlayCollapsed, setIsOverlayCollapsed] = useState(false);
  const markerPreset = getMarkerStylePreset(markerPresetKey);
  const coarsePointerDevice = isCoarsePointerDevice();
  const touchLikeUiMode = isMobileOverlay || coarsePointerDevice;
  const resolvedSearchCount = useMemo(() => {
    const parsedCount = Number(searchResultCount);
    if (Number.isFinite(parsedCount) && parsedCount >= 0) return parsedCount;
    return Number(properties.length || 0);
  }, [properties.length, searchResultCount]);
  const formattedSearchCount = useMemo(
    () => resolvedSearchCount.toLocaleString(locale),
    [resolvedSearchCount, locale]
  );
  const overlayCardStyle = useMemo(
    () => ({
      border: '1px solid rgba(30, 41, 59, 0.9)',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
    }),
    []
  );
  const favoritePropertyIdSet = useMemo(
    () => new Set(favoritePropertyIds.map((id) => String(id))),
    [favoritePropertyIds]
  );
  useEffect(() => {
    hoveredListingIdRef.current = hoveredListingId == null ? null : String(hoveredListingId);
  }, [hoveredListingId]);

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
    const mapInstance = mapRef.current;
    if (!mapInstance) return;
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
      if (entry.isAdvancedMarker) {
        entry.marker.map = isVisible ? mapInstance : null;
      } else if (typeof entry.marker.setVisible === 'function') {
        entry.marker.setVisible(isVisible);
      }
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

  const setActiveCircleInteractive = (interactive, touchLikeMode = touchLikeUiMode) => {
    const activeCircle = activeCircleRef.current;
    if (!activeCircle || typeof activeCircle.setOptions !== 'function') return;
    activeCircle.setOptions({
      clickable: interactive,
      draggable: interactive,
      editable: interactive && !touchLikeMode,
    });
  };

  const propertiesWithAddress = useMemo(() => properties
    .map((property) => ({
      property,
      propertyId: getPropertyId(property),
      addressQuery: buildAddressQuery(property.address, language),
    }))
    .filter((item) => item.property && item.propertyId && item.addressQuery), [properties, language]);

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

    loadGoogleMaps(apiKey, mapLanguage)
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
        setMapError(err.message || t('map.unableToLoadMap'));
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, mapLanguage, t]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !geocoderRef.current || !window.google || !window.google.maps) return undefined;

    let cancelled = false;

    markerEntriesRef.current.forEach((entry) => {
      if (entry.isAdvancedMarker) {
        entry.marker.map = null;
      } else if (typeof entry.marker.setMap === 'function') {
        entry.marker.setMap(null);
      }
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
      let AdvancedMarkerElementCtor = null;
      if (typeof mapsApi.importLibrary === 'function') {
        try {
          const markerLibrary = await mapsApi.importLibrary('marker');
          if (markerLibrary && markerLibrary.AdvancedMarkerElement) {
            AdvancedMarkerElementCtor = markerLibrary.AdvancedMarkerElement;
          }
        } catch (_err) {
          AdvancedMarkerElementCtor = null;
        }
      }

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
        const markerPrice = formatMarkerPrice(item.property.price, locale, t('map.priceUnavailable'));
        const markerListingTitle = safeText(item.property.title) || t('map.propertyListing');
        const markerDetailLine = buildMarkerDetailLine(item.property, item.addressQuery);
        const isHousePinPreset = markerPreset.markerMode === 'house';
        const isHoveredFromList = hoveredListingIdRef.current === propertyId;
        const canUseAdvancedMarker = Boolean(AdvancedMarkerElementCtor) && !isHousePinPreset;
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
        const markerElement = canUseAdvancedMarker
          ? createListingMarkerElement(
            markerPrice,
            { title: markerListingTitle, detailLine: markerDetailLine },
            isFavoriteProperty
          )
          : null;
        if (markerElement) {
          markerElement.classList.toggle('is-hovered', isHoveredFromList);
        }
        const marker = canUseAdvancedMarker
          ? new AdvancedMarkerElementCtor({
            map,
            position: coords,
            title: safeText(item.property.title) || item.addressQuery,
            content: markerElement || undefined,
            zIndex: isHoveredFromList ? 100 : 2,
          })
          : new mapsApi.Marker({
            map,
            position: coords,
            title: safeText(item.property.title) || item.addressQuery,
            icon: isHoveredFromList && markerHoverIcon ? markerHoverIcon : markerIcon,
            zIndex: isHoveredFromList ? 100 : 2,
            optimized: true,
          });

        marker.addListener('click', () => {
          const title = safeText(item.property.title) || t('map.propertyListing');
          const price = item.property.price != null
            ? `₪${Number(item.property.price).toLocaleString(locale)}`
            : t('map.priceUnavailable');
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
                <div style="margin-top:8px;color:#0e8a88;font-weight:700;">${escapeHtml(t('map.infoWindowCta'))} ›</div>
              </a>
            </div>`
          );
          if (canUseAdvancedMarker) {
            infoWindow.open({ map, anchor: marker });
          } else {
            infoWindow.open(map, marker);
          }
        });
        if (markerHoverIcon && !canUseAdvancedMarker) {
          marker.addListener('mouseover', () => {
            marker.setIcon(markerHoverIcon);
          });
          marker.addListener('mouseout', () => {
            marker.setIcon(
              hoveredListingIdRef.current === propertyId
                ? markerHoverIcon
                : markerIcon
            );
          });
        }

        markerEntriesRef.current.push({
          marker,
          frameMarker: null,
          propertyId,
          coords,
          markerElement,
          isAdvancedMarker: canUseAdvancedMarker,
          markerIcon,
          markerHoverIcon,
        });
        if (activeCircleRef.current) applyCircleFilter();
        bounds.extend(coords);
        placed += 1;
      }

      if (cacheChanged) writeGeocodeCache(geocodeCacheRef.current);

      if (!hasInitializedViewportRef.current) {
        if (placed === 1 && markerEntriesRef.current[0]) {
          map.setCenter(markerEntriesRef.current[0].coords);
          map.setZoom(13);
        } else if (placed > 1) {
          map.fitBounds(bounds, 42);
        } else {
          map.setCenter(DEFAULT_CENTER);
          map.setZoom(10);
        }
        hasInitializedViewportRef.current = true;
      }

      markerHydrationInProgressRef.current = false;
      applyCircleFilter();
    };

    updateMarkers();

    return () => {
      cancelled = true;
      markerEntriesRef.current.forEach((entry) => {
        if (entry.isAdvancedMarker) {
          entry.marker.map = null;
        } else if (typeof entry.marker.setMap === 'function') {
          entry.marker.setMap(null);
        }
        if (entry.frameMarker) entry.frameMarker.setMap(null);
      });
      markerEntriesRef.current = [];
      markerHydrationInProgressRef.current = false;
      expectedMarkerCountRef.current = 0;
    };
  }, [mapReady, propertiesWithAddress, markerPreset, favoritePropertyIdSet, locale, t]);

  useEffect(() => {
    const activeHoveredListingId = hoveredListingId == null ? '' : String(hoveredListingId);
    markerEntriesRef.current.forEach((entry) => {
      const isHovered = Boolean(activeHoveredListingId) && entry.propertyId === activeHoveredListingId;
      if (entry.markerElement) {
        entry.markerElement.classList.toggle('is-hovered', isHovered);
      }
      if (entry.isAdvancedMarker) {
        entry.marker.zIndex = isHovered ? 100 : 2;
        return;
      }
      if (typeof entry.marker.setZIndex === 'function') {
        entry.marker.setZIndex(isHovered ? 100 : 2);
      }
      if (entry.markerHoverIcon && entry.markerIcon && typeof entry.marker.setIcon === 'function') {
        entry.marker.setIcon(isHovered ? entry.markerHoverIcon : entry.markerIcon);
      }
    });
  }, [hoveredListingId]);

  useEffect(() => {
    if (!isVisible || !mapReady || !mapRef.current || !window.google || !window.google.maps) return undefined;
    const mapsApi = window.google.maps;
    const rafId = window.requestAnimationFrame(() => {
      const currentCenter = typeof mapRef.current.getCenter === 'function' ? mapRef.current.getCenter() : null;
      const currentZoom = typeof mapRef.current.getZoom === 'function' ? mapRef.current.getZoom() : null;
      mapsApi.event.trigger(mapRef.current, 'resize');
      if (currentCenter && Number.isFinite(currentZoom)) {
        mapRef.current.setCenter(currentCenter);
        mapRef.current.setZoom(currentZoom);
      }
      applyCircleFilter();
    });
    return () => {
      if (typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isVisible, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google || !window.google.maps) return undefined;
    const mapsApi = window.google.maps;
    const touchLikeDrawMode = isMobileOverlay || isCoarsePointerDevice();
    let isDraftDrawing = false;
    clearDrawListeners();
    if (!drawMode) {
      removeDraftCircle();
      setActiveCircleInteractive(true, touchLikeDrawMode);
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

    setActiveCircleInteractive(false, touchLikeDrawMode);
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
      isDraftDrawing = true;
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
      isDraftDrawing = false;
      if (activeCircleRef.current) {
        mapsApi.event.clearInstanceListeners(activeCircleRef.current);
        activeCircleRef.current.setMap(null);
      }
      activeCircleRef.current = draftCircleRef.current;
      draftCircleRef.current = null;
      drawStartRef.current = null;

      activeCircleRef.current.setOptions({
        clickable: true,
        editable: !touchLikeDrawMode,
        draggable: true,
        fillOpacity: 0.16,
      });
      mapsApi.event.addListener(activeCircleRef.current, 'radius_changed', applyCircleFilter);
      mapsApi.event.addListener(activeCircleRef.current, 'center_changed', applyCircleFilter);
      const lockMapPanningForCircleDrag = () => {
        if (!touchLikeDrawMode || !mapRef.current) return;
        mapRef.current.setOptions({
          draggable: false,
          gestureHandling: 'none',
          disableDoubleClickZoom: true,
        });
      };
      const unlockMapPanningForCircleDrag = () => {
        if (!touchLikeDrawMode || !mapRef.current) return;
        mapRef.current.setOptions({
          draggable: true,
          gestureHandling: 'greedy',
          disableDoubleClickZoom: false,
        });
      };
      mapsApi.event.addListener(activeCircleRef.current, 'mousedown', lockMapPanningForCircleDrag);
      mapsApi.event.addListener(activeCircleRef.current, 'dragstart', lockMapPanningForCircleDrag);
      mapsApi.event.addListener(activeCircleRef.current, 'mouseup', unlockMapPanningForCircleDrag);
      mapsApi.event.addListener(activeCircleRef.current, 'dragend', () => {
        unlockMapPanningForCircleDrag();
        applyCircleFilter();
      });

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

    const completeDraftFromWindow = () => {
      if (!isDraftDrawing) return;
      completeDraftCircle();
    };
    if (!touchLikeDrawMode) {
      window.addEventListener('mouseup', completeDraftFromWindow, true);
      window.addEventListener('pointerup', completeDraftFromWindow, true);
      window.addEventListener('blur', completeDraftFromWindow);
    }

    return () => {
      clearDrawListeners();
      isDraftDrawing = false;
      window.removeEventListener('mouseup', completeDraftFromWindow, true);
      window.removeEventListener('pointerup', completeDraftFromWindow, true);
      window.removeEventListener('blur', completeDraftFromWindow);
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
    if (!mapReady || !mapContainerRef.current) return undefined;
    const onContextMenu = (event) => {
      if (touchLikeUiMode) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onDragStart = (event) => {
      if (!touchLikeUiMode) return;
      event.preventDefault();
      event.stopPropagation();
    };
    mapContainerRef.current.addEventListener('contextmenu', onContextMenu, true);
    mapContainerRef.current.addEventListener('dragstart', onDragStart, true);
    return () => {
      if (!mapContainerRef.current) return;
      mapContainerRef.current.removeEventListener('contextmenu', onContextMenu, true);
      mapContainerRef.current.removeEventListener('dragstart', onDragStart, true);
    };
  }, [mapReady, touchLikeUiMode]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google || !window.google.maps) return undefined;
    if (!touchLikeUiMode || drawMode || !activeCircleRef.current || circleRadiusMeters <= 0) return undefined;
    const mapsApi = window.google.maps;
    let draggingCircle = false;

    const toLatLngPoint = (latLngLike) => {
      if (!latLngLike) return null;
      const lat = typeof latLngLike.lat === 'function'
        ? Number(latLngLike.lat())
        : Number(latLngLike.lat);
      const lng = typeof latLngLike.lng === 'function'
        ? Number(latLngLike.lng())
        : Number(latLngLike.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    };

    const isInsideActiveCircle = (latLngLike) => {
      if (!activeCircleRef.current || !latLngLike) return false;
      const centerPoint = toLatLngPoint(activeCircleRef.current.getCenter && activeCircleRef.current.getCenter());
      const probePoint = toLatLngPoint(latLngLike);
      const radiusMeters = Number(
        activeCircleRef.current.getRadius && activeCircleRef.current.getRadius()
      );
      if (!centerPoint || !probePoint || !Number.isFinite(radiusMeters) || radiusMeters <= 0) return false;
      return getDistanceMeters(centerPoint, probePoint) <= (radiusMeters + 90);
    };

    const lockMapPanning = () => {
      if (!mapRef.current) return;
      mapRef.current.setOptions({
        draggable: false,
        gestureHandling: 'none',
        disableDoubleClickZoom: true,
      });
    };

    const unlockMapPanning = () => {
      if (!mapRef.current) return;
      mapRef.current.setOptions({
        draggable: true,
        gestureHandling: 'greedy',
        disableDoubleClickZoom: false,
      });
    };

    const beginCircleDrag = (event) => {
      if (!event || !event.latLng || !activeCircleRef.current) return;
      if (!isInsideActiveCircle(event.latLng)) return;
      draggingCircle = true;
      lockMapPanning();
      activeCircleRef.current.setCenter(event.latLng);
      applyCircleFilter();
      if (event.domEvent) {
        event.domEvent.preventDefault();
        event.domEvent.stopPropagation();
      }
    };

    const continueCircleDrag = (event) => {
      if (!draggingCircle || !event || !event.latLng || !activeCircleRef.current) return;
      activeCircleRef.current.setCenter(event.latLng);
      applyCircleFilter();
      if (event.domEvent) {
        event.domEvent.preventDefault();
        event.domEvent.stopPropagation();
      }
    };

    const endCircleDrag = (event) => {
      if (!draggingCircle) return;
      draggingCircle = false;
      unlockMapPanning();
      applyCircleFilter();
      if (event && event.domEvent) {
        event.domEvent.preventDefault();
        event.domEvent.stopPropagation();
      }
    };

    const dragListeners = [
      mapsApi.event.addListener(mapRef.current, 'mousedown', beginCircleDrag),
      mapsApi.event.addListener(mapRef.current, 'touchstart', beginCircleDrag),
      mapsApi.event.addListener(mapRef.current, 'mousemove', continueCircleDrag),
      mapsApi.event.addListener(mapRef.current, 'touchmove', continueCircleDrag),
      mapsApi.event.addListener(mapRef.current, 'mouseup', endCircleDrag),
      mapsApi.event.addListener(mapRef.current, 'touchend', endCircleDrag),
      mapsApi.event.addListener(mapRef.current, 'touchcancel', endCircleDrag),
    ];

    return () => {
      dragListeners.forEach((listener) => {
        if (!listener) return;
        if (typeof listener.remove === 'function') listener.remove();
        else mapsApi.event.removeListener(listener);
      });
      unlockMapPanning();
    };
  }, [circleRadiusMeters, drawMode, mapReady, touchLikeUiMode]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return undefined;
    if (!touchLikeUiMode || drawMode || circleRadiusMeters <= 0) return undefined;
    mapRef.current.setOptions({
      draggable: false,
      gestureHandling: 'none',
      disableDoubleClickZoom: true,
    });
    return () => {
      if (!mapRef.current) return;
      mapRef.current.setOptions({
        draggable: true,
        gestureHandling: 'greedy',
        disableDoubleClickZoom: false,
      });
    };
  }, [circleRadiusMeters, drawMode, mapReady, touchLikeUiMode]);

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

  if (touchLikeUiMode) {
    return (
      <ConnectedListingsMapFallback
        properties={properties}
        searchResultCount={searchResultCount}
        favoritePropertyIds={favoritePropertyIds}
        onCircleSelectionChange={onCircleSelectionChange}
        clearSignal={clearSignal}
        drawModeToggleSignal={drawModeToggleSignal}
        onDrawModeChange={onDrawModeChange}
        isVisible={isVisible}
        hoveredListingId={hoveredListingId}
      />
    );
  }

  if (!apiKey) {
    return (
      <ConnectedListingsMapFallback
        properties={properties}
        searchResultCount={searchResultCount}
        favoritePropertyIds={favoritePropertyIds}
        onCircleSelectionChange={onCircleSelectionChange}
        clearSignal={clearSignal}
        drawModeToggleSignal={drawModeToggleSignal}
        onDrawModeChange={onDrawModeChange}
        isVisible={isVisible}
        hoveredListingId={hoveredListingId}
      />
    );
  }

  if (mapError) {
    return (
      <ConnectedListingsMapFallback
        properties={properties}
        searchResultCount={searchResultCount}
        favoritePropertyIds={favoritePropertyIds}
        onCircleSelectionChange={onCircleSelectionChange}
        clearSignal={clearSignal}
        drawModeToggleSignal={drawModeToggleSignal}
        onDrawModeChange={onDrawModeChange}
        isVisible={isVisible}
        hoveredListingId={hoveredListingId}
      />
    );
  }

  const toggleDrawMode = () => {
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

  const adjustMapZoom = (delta) => {
    if (!mapRef.current || typeof mapRef.current.getZoom !== 'function') return;
    const currentZoom = Number(mapRef.current.getZoom());
    if (!Number.isFinite(currentZoom)) return;
    mapRef.current.setZoom(currentZoom + delta);
  };

  return (
    <div className="google-listings-map-shell">
      <div
        className={`google-listings-map-overlay-info ${isOverlayCollapsed ? 'is-collapsed' : ''}`}
        style={overlayCardStyle}
      >
        <header className="google-listings-map-header">
          {isMobileOverlay ? (
            <div className="google-listings-map-header-top">
              <button
                type="button"
                className="secondary-btn google-listings-map-collapse-btn"
                onClick={() => setIsOverlayCollapsed((value) => !value)}
              >
                {isOverlayCollapsed ? t('map.expand') : t('map.collapse')}
              </button>
            </div>
          ) : null}
          {!isOverlayCollapsed ? (
            <div className="google-listings-map-copy-block">
              <h2>{t('map.title')}</h2>
              <p>{t('map.subtitle')}</p>
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
              {t('map.drawSearchCircle')}
            </button>
            <button
              type="button"
              className="secondary-btn map-draw-btn"
              onClick={clearCircleFilter}
              disabled={!drawMode && !activeCircleRef.current}
            >
              {t('map.clearArea')}
            </button>
            <div
              className="google-listings-map-search-count"
              aria-label={t('map.listingsFoundAriaLabel', { count: formattedSearchCount })}
            >
              <svg
                className="google-listings-map-search-count-icon"
                viewBox="0 0 24 24"
                role="img"
                aria-hidden="true"
              >
                <path
                  d="M5 12L12 5.7L19 12V20.2H5V12Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3.6 12.2L12 4.7L20.4 12.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.7 20.2V16H14.3V20.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 13.9C11.2 12.7 9.5 13.1 9.5 14.7C9.5 15.8 10.6 16.7 12 17.8C13.4 16.7 14.5 15.8 14.5 14.7C14.5 13.1 12.8 12.7 12 13.9Z"
                  fill="currentColor"
                  stroke="none"
                />
                <path
                  d="M16.4 7.8V6.1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{formattedSearchCount}</span>
            </div>
          </div>
        ) : null}
      </div>
      <div className="google-listings-map-canvas-wrap">
        <div
          ref={mapContainerRef}
          className={`google-listings-map-canvas map-viewport ${drawMode ? 'is-drawing' : ''}`}
        />
        <div className="google-listings-map-zoom-overlay" aria-label={t('map.zoomControlsAriaLabel')}>
          <span className="google-listings-map-zoom-flourish" aria-hidden="true" />
          <div className="google-listings-map-zoom-controls">
            <button
              type="button"
              className="google-listings-map-zoom-btn"
              onClick={() => adjustMapZoom(ZOOM_STEP)}
              aria-label={t('map.zoomInAriaLabel')}
            >
              +
            </button>
            <button
              type="button"
              className="google-listings-map-zoom-btn"
              onClick={() => adjustMapZoom(-ZOOM_STEP)}
              aria-label={t('map.zoomOutAriaLabel')}
            >
              -
            </button>
          </div>
        </div>
      </div>
      <p className="google-listings-map-caption">
        {circleRadiusMeters > 0
          ? t('map.showingInsideRadius', {
            visible: markerCount,
            total: totalMarkerCount,
            radiusKm: (circleRadiusMeters / 1000).toFixed(2),
          })
          : markerCount > 0
            ? t('map.showingMappedListings', {
              visible: markerCount,
              listingWord: markerCount > 1 ? t('map.listingWordPlural') : t('map.listingWordSingular'),
            })
            : t('map.mapReady')}
      </p>
    </div>
  );
};

export default GoogleListingsMap;
