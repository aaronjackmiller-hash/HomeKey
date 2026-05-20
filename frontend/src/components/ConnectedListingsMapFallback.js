import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getPropertyId } from '../utils/propertyIdentity';

const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 }; // Tel Aviv
const MAX_MARKERS = 40;
const MIN_CIRCLE_RADIUS_METERS = 80;
const MOBILE_OVERLAY_QUERY = '(max-width: 767px)';
const FAVORITE_PRICE_PIN_STYLE = {
  pinBackground: '#FF0000',
  pinBorderColor: '#000000',
  borderWidth: 0.9,
  pinTextColor: '#FFFFFF',
  fontWeight: 700,
};
const FALLBACK_MARKER_STYLE_PRESETS = {
  minimal: {
    label: 'Minimal',
    markerMode: 'pricePin',
    pinBackground: '#1A1A1A',
    pinBorderColor: '#1A1A1A',
    borderWidth: 1,
    pinTextColor: '#ffffff',
    minWidth: 50,
    height: 20,
    pointerHeight: 7,
    fontSize: 10,
    fontWeight: 600,
  },
  house: {
    label: 'House Pins',
    markerMode: 'house',
    iconWidth: 20,
    iconHeight: 28,
    pinColor: '#2563eb',
    pinStrokeColor: '#1d4ed8',
    homeStrokeColor: '#ffffff',
  },
  medium: {
    label: 'Medium',
    markerMode: 'pricePin',
    pinBackground: '#2b3440',
    pinBorderColor: '#2b3440',
    borderWidth: 1,
    pinTextColor: '#ffffff',
    minWidth: 60,
    height: 24,
    pointerHeight: 8,
    fontSize: 11,
    fontWeight: 600,
  },
  bold: {
    label: 'Bold',
    markerMode: 'pricePin',
    pinBackground: '#1A1A1A',
    pinBorderColor: '#1A1A1A',
    borderWidth: 1,
    pinTextColor: '#ffffff',
    minWidth: 64,
    height: 26,
    pointerHeight: 9,
    fontSize: 11,
    fontWeight: 700,
  },
};
const DEFAULT_FALLBACK_MARKER_PRESET_KEY = 'minimal';
const CITY_CENTER_HINTS = [
  { name: 'tel aviv', center: { lat: 32.0853, lng: 34.7818 } },
  { name: 'jerusalem', center: { lat: 31.7683, lng: 35.2137 } },
  { name: 'haifa', center: { lat: 32.794, lng: 34.9896 } },
  { name: 'rishon', center: { lat: 31.971, lng: 34.7894 } },
  { name: 'petah', center: { lat: 32.0871, lng: 34.8878 } },
  { name: 'netanya', center: { lat: 32.3215, lng: 34.8532 } },
  { name: 'beer', center: { lat: 31.2518, lng: 34.7913 } },
  { name: 'בני ברק', center: { lat: 32.0809, lng: 34.8338 } },
  { name: 'תל אביב', center: { lat: 32.0853, lng: 34.7818 } },
  { name: 'ירושלים', center: { lat: 31.7683, lng: 35.2137 } },
  { name: 'חיפה', center: { lat: 32.794, lng: 34.9896 } },
];

const safeText = (value) => (typeof value === 'string' ? value.trim() : '');
const escapeSvgText = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
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

const formatMarkerPrice = (price) => {
  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) return 'N/A';
  return `₪${parsedPrice.toLocaleString()}`;
};

const hashString = (value) => {
  let hash = 0;
  const source = String(value || '');
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const resolveBaseCenter = (addressQuery) => {
  const normalizedAddress = String(addressQuery || '').toLowerCase();
  const match = CITY_CENTER_HINTS.find((item) => normalizedAddress.includes(item.name.toLowerCase()));
  return match ? match.center : DEFAULT_CENTER;
};

const buildFallbackCoords = (addressQuery, markerIndex = 0) => {
  const baseCenter = resolveBaseCenter(addressQuery);
  const hashSeed = hashString(`${addressQuery}:${markerIndex}`);
  const radiusMeters = 180 + (hashSeed % 1600);
  const angleRad = ((hashSeed % 360) * Math.PI) / 180;
  const latOffset = (radiusMeters * Math.cos(angleRad)) / 111320;
  const lngDenominator = 111320 * Math.max(Math.cos((baseCenter.lat * Math.PI) / 180), 0.25);
  const lngOffset = (radiusMeters * Math.sin(angleRad)) / lngDenominator;
  return {
    lat: baseCenter.lat + latOffset,
    lng: baseCenter.lng + lngOffset,
  };
};

const createFallbackPriceIcon = (priceText, preset, styleOverrides = {}) => {
  const resolvedStyleOverrides = styleOverrides && typeof styleOverrides === 'object' ? styleOverrides : {};
  const minWidth = Number(preset.minWidth) || 60;
  const height = Number(preset.height) || 24;
  const pointerHeight = Number(preset.pointerHeight) || 8;
  const pinBackground = resolvedStyleOverrides.pinBackground || preset.pinBackground || '#1A1A1A';
  const pinBorderColor = resolvedStyleOverrides.pinBorderColor || preset.pinBorderColor || pinBackground;
  const borderWidth = Number(resolvedStyleOverrides.borderWidth) || Number(preset.borderWidth) || 1;
  const pinTextColor = resolvedStyleOverrides.pinTextColor || preset.pinTextColor || '#ffffff';
  const fontSize = Number(preset.fontSize) || 11;
  const fontWeight = Number(resolvedStyleOverrides.fontWeight) || Number(preset.fontWeight) || 700;
  const safePriceText = escapeSvgText(priceText);
  const estimatedTextWidth = Math.ceil(safePriceText.length * fontSize * 0.62);
  const pinWidth = Math.max(minWidth, estimatedTextWidth + 16);
  const totalHeight = height + pointerHeight;
  const centerX = pinWidth / 2;
  const pointerHalfWidth = Math.max(5, Math.round(pinWidth * 0.12));
  const textY = Math.round((height / 2) + (fontSize * 0.36));
  const radius = Math.round(height / 2);
  const halfBorder = borderWidth / 2;
  const leftX = halfBorder;
  const rightX = pinWidth - halfBorder;
  const topY = halfBorder;
  const bubbleBottomY = height - halfBorder;
  const tipY = totalHeight - halfBorder;
  const safeRadius = Math.max(1, radius - halfBorder);
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pinWidth}" height="${totalHeight}" viewBox="0 0 ${pinWidth} ${totalHeight}" overflow="visible">
    <path d="${pinPath}" fill="${pinBackground}" stroke="${pinBorderColor}" stroke-width="${borderWidth}" stroke-linejoin="round"/>
    <text x="${centerX}" y="${textY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${pinTextColor}">${safePriceText}</text>
  </svg>`;
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    iconSize: [pinWidth, totalHeight],
    iconAnchor: [pinWidth / 2, totalHeight],
    popupAnchor: [0, -24],
  });
};

const createFallbackHouseIcon = (preset) => {
  const iconWidth = Number(preset.iconWidth) || 20;
  const iconHeight = Number(preset.iconHeight) || 28;
  const pinColor = preset.pinColor || '#2563eb';
  const pinStrokeColor = preset.pinStrokeColor || '#1d4ed8';
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
  return L.divIcon({
    className: 'fallback-house-pin',
    html: svg,
    iconSize: [iconWidth, iconHeight],
    iconAnchor: [iconWidth / 2, iconHeight],
    popupAnchor: [0, -24],
  });
};

const getFallbackMarkerStylePreset = (presetKey) =>
  FALLBACK_MARKER_STYLE_PRESETS[presetKey] || FALLBACK_MARKER_STYLE_PRESETS[DEFAULT_FALLBACK_MARKER_PRESET_KEY];

const createFallbackMarkerIcon = (priceText, preset, styleOverrides = {}) => (preset.markerMode === 'house'
  ? createFallbackHouseIcon(preset)
  : createFallbackPriceIcon(priceText, preset, styleOverrides));

const isCoarsePointerDevice = () => {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) {
    return true;
  }
  const touchPoints = typeof navigator !== 'undefined' ? Number(navigator.maxTouchPoints) : 0;
  return 'ontouchstart' in window || touchPoints > 0;
};

const ConnectedListingsMapFallback = ({
  properties = [],
  favoritePropertyIds = [],
  onCircleSelectionChange,
  clearSignal = 0,
  drawModeToggleSignal = 0,
  onDrawModeChange,
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const activeCircleRef = useRef(null);
  const pendingCenterRef = useRef(null);
  const lastPointerLatLngRef = useRef(null);
  const lastCompletionTimestampRef = useRef(0);
  const drawToggleSignalRef = useRef(drawModeToggleSignal);
  const clearSignalInitializedRef = useRef(false);
  const [drawMode, setDrawMode] = useState(false);
  const [markerCount, setMarkerCount] = useState(0);
  const [totalMarkerCount, setTotalMarkerCount] = useState(0);
  const [circleRadiusMeters, setCircleRadiusMeters] = useState(0);
  const [hasActiveCircle, setHasActiveCircle] = useState(false);
  const [mobileMoveCircleMode, setMobileMoveCircleMode] = useState(false);
  const markerPresetKey = DEFAULT_FALLBACK_MARKER_PRESET_KEY;
  const [isMobileOverlay, setIsMobileOverlay] = useState(false);
  const [isOverlayCollapsed, setIsOverlayCollapsed] = useState(false);
  const markerPreset = getFallbackMarkerStylePreset(markerPresetKey);
  const favoritePropertyIdSet = useMemo(
    () => new Set(favoritePropertyIds.map((id) => String(id))),
    [favoritePropertyIds]
  );

  const emitCircleSelection = (nextSelection) => {
    if (typeof onCircleSelectionChange === 'function') {
      onCircleSelectionChange(nextSelection);
    }
  };

  const setMarkerVisibility = (marker, map, visible) => {
    if (!marker || !map) return;
    if (visible) {
      if (!map.hasLayer(marker)) marker.addTo(map);
      return;
    }
    if (map.hasLayer(marker)) map.removeLayer(marker);
  };

  const removeActiveCircle = () => {
    const map = mapInstanceRef.current;
    pendingCenterRef.current = null;
    lastPointerLatLngRef.current = null;
    lastCompletionTimestampRef.current = 0;
    if (activeCircleRef.current && map) {
      map.removeLayer(activeCircleRef.current);
      activeCircleRef.current = null;
    }
  };

  const applyCircleFilter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const activeCircle = activeCircleRef.current;
    const hasAreaFilter = Boolean(activeCircle);
    const center = hasAreaFilter ? activeCircle.getLatLng() : null;
    const radius = hasAreaFilter ? Number(activeCircle.getRadius()) : 0;
    const selectedPropertyIds = [];
    let visibleMarkers = 0;

    markersRef.current.forEach((entry) => {
      const distance = hasAreaFilter ? map.distance(center, entry.marker.getLatLng()) : 0;
      const isVisible = !hasAreaFilter || distance <= radius;
      setMarkerVisibility(entry.marker, map, isVisible);
      if (isVisible) {
        visibleMarkers += 1;
        selectedPropertyIds.push(entry.propertyId);
      }
    });

    setMarkerCount(visibleMarkers);
    setTotalMarkerCount(markersRef.current.length);
    setHasActiveCircle(hasAreaFilter);
    setCircleRadiusMeters(hasAreaFilter ? radius : 0);
    emitCircleSelection({
      active: hasAreaFilter,
      propertyIds: selectedPropertyIds,
      radiusMeters: hasAreaFilter ? radius : 0,
      center: hasAreaFilter ? { lat: center.lat, lng: center.lng } : null,
    });
  };

  const clearCircleFilter = () => {
    removeActiveCircle();
    setDrawMode(false);
    setMobileMoveCircleMode(false);
    const map = mapInstanceRef.current;
    if (map) {
      if (map.dragging) map.dragging.enable();
      if (map.doubleClickZoom) map.doubleClickZoom.enable();
    }
    applyCircleFilter();
  };

  const toggleDrawMode = () => {
    setMobileMoveCircleMode(false);
    setDrawMode((value) => {
      const nextValue = !value;
      const map = mapInstanceRef.current;
      if (map) {
        if (nextValue) {
          if (map.dragging) map.dragging.disable();
          if (map.doubleClickZoom) map.doubleClickZoom.disable();
        } else {
          if (map.dragging) map.dragging.enable();
          if (map.doubleClickZoom) map.doubleClickZoom.enable();
        }
      }
      return nextValue;
    });
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
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    mapInstanceRef.current = map;
    window.setTimeout(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    }, 0);
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((entry) => {
      if (entry.marker && map.hasLayer(entry.marker)) map.removeLayer(entry.marker);
    });
    markersRef.current = [];

    const markerInputs = propertiesWithAddress.slice(0, MAX_MARKERS);
    const bounds = [];
    markerInputs.forEach((item, markerIndex) => {
      const coords = buildFallbackCoords(item.addressQuery, markerIndex);
      const propertyId = String(item.propertyId);
      const isFavoriteProperty = favoritePropertyIdSet.has(propertyId);
      const markerStyleOverrides = isFavoriteProperty ? FAVORITE_PRICE_PIN_STYLE : {};
      const priceText = formatMarkerPrice(item.property.price);
      const marker = L.marker([coords.lat, coords.lng], {
        title: safeText(item.property.title) || item.addressQuery,
        icon: createFallbackMarkerIcon(priceText, markerPreset, markerStyleOverrides),
      });
      marker.bindPopup(
        `<strong>${safeText(item.property.title) || 'Property listing'}</strong><br/>${priceText}<br/>${item.addressQuery}`
      );
      marker.addTo(map);
      markersRef.current.push({
        marker,
        propertyId,
      });
      bounds.push([coords.lat, coords.lng]);
    });

    window.setTimeout(() => {
      if (!mapInstanceRef.current) return;
      map.invalidateSize();
      setTotalMarkerCount(markersRef.current.length);
      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [36, 36] });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 13);
      } else {
        map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 10);
      }
      applyCircleFilter();
    }, 0);
  }, [markerPreset, propertiesWithAddress, favoritePropertyIdSet]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return undefined;
    const coarsePointer = isCoarsePointerDevice();
    if (!drawMode) {
      pendingCenterRef.current = null;
      lastPointerLatLngRef.current = null;
      lastCompletionTimestampRef.current = 0;
      if (map.dragging) map.dragging.enable();
      if (map.doubleClickZoom) map.doubleClickZoom.enable();
      return undefined;
    }

    if (map.dragging) map.dragging.disable();
    if (map.doubleClickZoom) map.doubleClickZoom.disable();

    const getEventLatLng = (event) => {
      if (!event || !event.latlng) return null;
      return event.latlng;
    };

    const startDraftCircle = (latLng) => {
      if (!latLng) return;
      removeActiveCircle();
      pendingCenterRef.current = latLng;
      lastPointerLatLngRef.current = latLng;
      activeCircleRef.current = L.circle(latLng, {
        radius: MIN_CIRCLE_RADIUS_METERS,
        color: '#0e8a88',
        fillColor: '#0e8a88',
        fillOpacity: 0.16,
        weight: 2,
      }).addTo(map);
    };

    const updateDraftRadius = (latLng) => {
      if (!latLng || !pendingCenterRef.current || !activeCircleRef.current) return;
      const radius = Math.max(
        MIN_CIRCLE_RADIUS_METERS,
        map.distance(pendingCenterRef.current, latLng)
      );
      activeCircleRef.current.setRadius(radius);
      lastPointerLatLngRef.current = latLng;
    };

    const completeDraftCircle = (event) => {
      const latLng = getEventLatLng(event) || lastPointerLatLngRef.current;
      if (!pendingCenterRef.current || !activeCircleRef.current) return;
      if (latLng) updateDraftRadius(latLng);
      pendingCenterRef.current = null;
      lastPointerLatLngRef.current = null;
      lastCompletionTimestampRef.current = Date.now();
      setDrawMode(false);
      applyCircleFilter();
    };

    const onPointerMove = (event) => {
      const latLng = getEventLatLng(event);
      if (!latLng) return;
      updateDraftRadius(latLng);
    };

    const onPointerDown = (event) => {
      const latLng = getEventLatLng(event);
      if (!latLng) return;
      startDraftCircle(latLng);
    };

    const onTapFallback = (event) => {
      if (Date.now() - lastCompletionTimestampRef.current < 250) return;
      const latLng = getEventLatLng(event);
      if (!latLng) return;
      if (!pendingCenterRef.current || !activeCircleRef.current) {
        startDraftCircle(latLng);
        return;
      }
      completeDraftCircle(event);
    };

    if (coarsePointer) {
      map.on('touchmove', onPointerMove);
      map.on('touchstart', onPointerDown);
      map.on('touchend', completeDraftCircle);
      map.on('click', onTapFallback);
    } else {
      map.on('mousemove', onPointerMove);
      map.on('mousedown', onPointerDown);
      map.on('mouseup', completeDraftCircle);
    }

    return () => {
      map.off('mousemove', onPointerMove);
      map.off('mousedown', onPointerDown);
      map.off('mouseup', completeDraftCircle);
      map.off('touchmove', onPointerMove);
      map.off('touchstart', onPointerDown);
      map.off('touchend', completeDraftCircle);
      map.off('click', onTapFallback);
      if (map.dragging) map.dragging.enable();
      if (map.doubleClickZoom) map.doubleClickZoom.enable();
    };
  }, [drawMode]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mobileMoveCircleMode || drawMode || !activeCircleRef.current || !isCoarsePointerDevice()) {
      return undefined;
    }

    const onTapToMoveCircle = (event) => {
      if (!event || !event.latlng || !activeCircleRef.current) return;
      activeCircleRef.current.setLatLng(event.latlng);
      setMobileMoveCircleMode(false);
      applyCircleFilter();
    };

    map.on('click', onTapToMoveCircle);
    return () => {
      map.off('click', onTapToMoveCircle);
    };
  }, [drawMode, mobileMoveCircleMode]);

  useEffect(() => {
    if (!clearSignalInitializedRef.current) {
      clearSignalInitializedRef.current = true;
      return;
    }
    clearCircleFilter();
  }, [clearSignal]);

  useEffect(() => () => {
    emitCircleSelection({
      active: false,
      propertyIds: [],
      radiusMeters: 0,
      center: null,
    });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
  }, []);
  const coarsePointerDevice = isCoarsePointerDevice();

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
                ? (coarsePointerDevice ? 'Tap center, then edge' : 'Draw Mode')
                : 'Draw search circle'}
            </button>
            {coarsePointerDevice && !drawMode && activeCircleRef.current ? (
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
          className={`google-listings-map-canvas connected-map-fallback-canvas map-viewport ${drawMode ? 'is-drawing' : ''}`}
        />
      </div>
      <p className="google-listings-map-caption">
        {drawMode && coarsePointerDevice
          ? 'Tap once for center, then tap again on the edge to apply the area.'
          : hasActiveCircle
          ? `Showing ${markerCount} of ${totalMarkerCount} mapped listings inside ${(circleRadiusMeters / 1000).toFixed(2)} km.`
          : markerCount > 0
            ? `Showing ${markerCount} mapped listing${markerCount > 1 ? 's' : ''}.`
            : 'Map is ready. Matching listing markers will appear as addresses resolve.'}
      </p>
    </div>
  );
};

export default ConnectedListingsMapFallback;
