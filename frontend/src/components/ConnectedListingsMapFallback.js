import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getPropertyId } from '../utils/propertyIdentity';
import { useLanguage } from '../context/LanguageContext';
import { buildAddressQuery } from '../utils/addressLocalization';

const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 }; // Tel Aviv
const MAX_MARKERS = 40;
const MIN_CIRCLE_RADIUS_METERS = 80;
const ZOOM_STEP = 1;
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
const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
const escapeSvgText = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
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
  return [roomLabel, neighborhoodLabel].filter(Boolean).join(' | ');
};

const buildMarkerPopupCardHtml = ({
  href = '',
  title = '',
  price = '',
  detailLine = '',
  imageUrl = '',
  ctaLabel = '',
}) => {
  const safeHref = escapeHtml(href || '#');
  const safeTitle = escapeHtml(title || 'Listing');
  const safePrice = escapeHtml(price || '');
  const safeDetailLine = escapeHtml(detailLine || '');
  const safeImageUrl = escapeHtml(imageUrl || '');
  const safeCtaLabel = escapeHtml(ctaLabel || 'View full listing');
  return `<a href="${safeHref}" style="display:block;width:252px;padding:12px;border:1px solid #dde3ea;border-radius:14px;background:#ffffff;color:#0f172a;text-decoration:none;font-family:Inter,Roboto,'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;box-shadow:0 12px 26px rgba(15,23,42,0.14);">
    <div style="display:flex;flex-direction:column;gap:4px;margin:0 0 10px;">
      <p style="margin:0;font-size:15px;font-weight:800;line-height:1.2;color:#0f172a;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${safeTitle}</p>
      <p style="margin:0;font-size:31px;font-weight:700;line-height:1;color:#111827;" dir="ltr">${safePrice}</p>
      <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.01em;color:#334155;">${safeDetailLine}</p>
    </div>
    <div style="border:1px solid #111111;border-radius:12px;padding:2px;box-shadow:inset 0 0 0 1px rgba(15,23,42,0.2);background:#ffffff;overflow:hidden;">
      <img src="${safeImageUrl}" alt="${safeTitle}" style="display:block;width:100%;height:128px;object-fit:cover;border-radius:9px;" />
    </div>
    <div style="margin-top:10px;font-size:15px;font-weight:700;color:#0e8a88;">${safeCtaLabel} &#8250;</div>
  </a>`;
};
const formatMarkerPrice = (price, locale = 'en-US', unavailableLabel = 'N/A') => {
  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) return unavailableLabel;
  return `₪${parsedPrice.toLocaleString(locale)}`;
};
const getFallbackMarkerImageUrl = (property, propertyId) => {
  const propertyImages = property && Array.isArray(property.images) ? property.images : [];
  const imageCandidates = [
    ...propertyImages,
    property?.mainImage,
    property?.image,
    property?.imageUrl,
    property?.thumbnail,
  ];
  const firstImage = imageCandidates.find((imageUrl) => typeof imageUrl === 'string' && imageUrl.trim());
  if (firstImage) return firstImage.trim();
  return `https://picsum.photos/seed/homekey-map-marker-${encodeURIComponent(String(propertyId || 'listing'))}/240/180`;
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

const createFallbackPriceIcon = (priceText, preset, styleOverrides = {}, options = {}) => {
  const resolvedStyleOverrides = styleOverrides && typeof styleOverrides === 'object' ? styleOverrides : {};
  const resolvedOptions = options && typeof options === 'object' ? options : {};
  const scale = Number.isFinite(Number(resolvedOptions.scale)) && Number(resolvedOptions.scale) > 0
    ? Number(resolvedOptions.scale)
    : 1;
  const hoverMode = resolvedOptions.hoverMode === 'map'
    ? 'map'
    : resolvedOptions.hoverMode === 'list'
      ? 'list'
      : '';
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
  const estimatedTextWidth = Math.ceil(String(priceText || '').length * fontSize * 0.62);
  const pinWidth = Math.max(minWidth, estimatedTextWidth + 16);
  const scaledPinWidth = Math.round(pinWidth * scale);
  const scaledHeight = Math.round(height * scale);
  const scaledPointerHeight = Math.round(pointerHeight * scale);
  const scaledFontSize = Math.max(10, Math.round(fontSize * scale));
  const totalHeight = scaledHeight + scaledPointerHeight;
  const markerRootClassName = `map-listing-marker radar-container${hoverMode ? ` is-${hoverMode}-hovered` : ''}`;
  const captionTitle = escapeHtml(resolvedOptions.captionTitle || '');
  const captionPrice = escapeHtml(resolvedOptions.captionPrice || priceText);
  const captionMeta = escapeHtml(resolvedOptions.captionMeta || '');
  const captionImageUrl = escapeHtml(resolvedOptions.captionImageUrl || '');
  const captionImageAlt = escapeHtml(resolvedOptions.captionImageAlt || resolvedOptions.captionTitle || 'Listing');
  const markerPinInlineStyle = [
    `--map-marker-pin-bg:${pinBackground}`,
    `min-width:${scaledPinWidth}px`,
    `height:${scaledHeight}px`,
    `background:${pinBackground}`,
    `border:${borderWidth}px solid ${pinBorderColor}`,
    `color:${pinTextColor}`,
    `font-size:${scaledFontSize}px`,
    `font-weight:${fontWeight}`,
  ].join(';');
  const markerCaptionHtml = `<div class="map-hovered-listing-caption animate-fadeIn animate-luxury-card">
    <div class="map-hovered-listing-caption__text-card">
      <p class="map-hovered-listing-caption__title">${captionTitle || 'Listing'}</p>
      <p class="map-hovered-listing-caption__price">${captionPrice}</p>
      <p class="map-hovered-listing-caption__meta">${captionMeta || escapeHtml(priceText)}</p>
    </div>
    <div class="map-hovered-listing-caption__image-card">
      <img class="map-hovered-listing-caption__image" src="${captionImageUrl}" alt="${captionImageAlt}" loading="lazy" decoding="async" />
    </div>
  </div>`;
  return L.divIcon({
    className: 'fallback-price-pin',
    html: `<div class="${markerRootClassName}"><span class="radar-pulse-ring faint-radar-rings"></span><span class="map-listing-marker-pin" style="${markerPinInlineStyle}">${safePriceText}</span>${markerCaptionHtml}</div>`,
    iconSize: [scaledPinWidth, totalHeight],
    iconAnchor: [scaledPinWidth / 2, totalHeight],
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

const createFallbackMarkerIcon = (priceText, preset, styleOverrides = {}, options = {}) => (preset.markerMode === 'house'
  ? createFallbackHouseIcon(preset)
  : createFallbackPriceIcon(priceText, preset, styleOverrides, options));

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

const ConnectedListingsMapFallback = ({
  properties = [],
  searchResultCount = null,
  favoritePropertyIds = [],
  onCircleSelectionChange,
  clearSignal = 0,
  drawModeToggleSignal = 0,
  onDrawModeChange,
  isVisible = true,
  hoveredListingId = null,
  statusNotice = '',
}) => {
  const { t, locale, language } = useLanguage();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const hasInitializedViewportRef = useRef(false);
  const activeCircleRef = useRef(null);
  const pendingCenterRef = useRef(null);
  const lastPointerLatLngRef = useRef(null);
  const lastCompletionTimestampRef = useRef(0);
  const drawToggleSignalRef = useRef(drawModeToggleSignal);
  const clearSignalInitializedRef = useRef(false);
  const hoveredListingIdRef = useRef(hoveredListingId);
  const [drawMode, setDrawMode] = useState(false);
  const [markerCount, setMarkerCount] = useState(0);
  const [totalMarkerCount, setTotalMarkerCount] = useState(0);
  const [circleRadiusMeters, setCircleRadiusMeters] = useState(0);
  const [hasActiveCircle, setHasActiveCircle] = useState(false);
  const markerPresetKey = DEFAULT_FALLBACK_MARKER_PRESET_KEY;
  const [isMobileOverlay, setIsMobileOverlay] = useState(false);
  const [isOverlayCollapsed, setIsOverlayCollapsed] = useState(false);
  const markerPreset = getFallbackMarkerStylePreset(markerPresetKey);
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
    hoveredListingIdRef.current = hoveredListingId == null ? '' : String(hoveredListingId);
  }, [hoveredListingId]);

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
  const syncHoveredMarkerClass = (marker, hoverState = {}) => {
    const isListHovered = Boolean(hoverState.isListHovered);
    const isMapHovered = Boolean(hoverState.isMapHovered);
    const isHovered = isListHovered || isMapHovered;
    if (!marker || typeof marker.getElement !== 'function') return;
    const markerElement = marker.getElement();
    if (!markerElement) return;
    markerElement.classList.toggle('is-list-hovered', isListHovered);
    markerElement.classList.toggle('is-map-hovered', isMapHovered);
    markerElement.classList.toggle('is-hovered', isHovered);
    const markerRoot = markerElement.querySelector('.map-listing-marker');
    if (!markerRoot) return;
    markerRoot.classList.toggle('is-list-hovered', isListHovered);
    markerRoot.classList.toggle('is-map-hovered', isMapHovered);
    markerRoot.classList.toggle('is-hovered', isHovered);
    if (typeof marker.setZIndexOffset === 'function') {
      marker.setZIndexOffset(isMapHovered ? 900 : (isHovered ? 800 : 0));
    }
  };
  const applyFallbackMarkerHoverVisualState = (entry) => {
    if (!entry || !entry.propertyId) return;
    const activeHoveredListingId = hoveredListingIdRef.current;
    const isListHovered = Boolean(activeHoveredListingId) && entry.propertyId === activeHoveredListingId;
    const isMapHovered = Boolean(entry.isMapHovered);
    const nextIconVariant = isMapHovered ? 'map' : (isListHovered ? 'list' : 'default');
    const nextIcon = isMapHovered
      ? (entry.fallbackMarkerMapHoverIcon || entry.fallbackMarkerListHoverIcon || entry.fallbackMarkerIcon)
      : isListHovered
        ? (entry.fallbackMarkerListHoverIcon || entry.fallbackMarkerIcon)
        : entry.fallbackMarkerIcon;
    if (typeof entry.marker?.setIcon === 'function' && nextIcon && entry.activeIconVariant !== nextIconVariant) {
      entry.marker.setIcon(nextIcon);
      entry.activeIconVariant = nextIconVariant;
    }
    syncHoveredMarkerClass(entry.marker, { isListHovered, isMapHovered });
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
    const map = mapInstanceRef.current;
    if (map) {
      if (map.dragging) map.dragging.enable();
      if (map.doubleClickZoom) map.doubleClickZoom.enable();
    }
    applyCircleFilter();
  };

  const setActiveCircleInteractive = (interactive) => {
    const activeCircle = activeCircleRef.current;
    if (!activeCircle) return;
    activeCircle.options.interactive = interactive;
    if (typeof activeCircle.getElement === 'function') {
      const circleElement = activeCircle.getElement();
      if (circleElement) {
        circleElement.style.pointerEvents = interactive ? 'auto' : 'none';
      }
    }
  };

  const toggleDrawMode = () => {
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

  const adjustMapZoom = (delta) => {
    const map = mapInstanceRef.current;
    if (!map || typeof map.getZoom !== 'function' || typeof map.setZoom !== 'function') return;
    const currentZoom = Number(map.getZoom());
    if (!Number.isFinite(currentZoom)) return;
    map.setZoom(currentZoom + delta);
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
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    mapInstanceRef.current = map;
    window.setTimeout(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    }, 0);
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((entry) => {
      if (typeof entry.cleanupHoverListeners === 'function') {
        entry.cleanupHoverListeners();
      }
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
      const priceText = formatMarkerPrice(item.property.price, locale, t('map.priceUnavailable'));
      const markerListingTitle = safeText(item.property.title) || t('map.propertyListing');
      const markerDetailLine = buildMarkerDetailLine(item.property, item.addressQuery);
      const markerImageUrl = getFallbackMarkerImageUrl(item.property, item.propertyId);
      const markerCaptionOptions = {
        captionTitle: markerListingTitle,
        captionPrice: priceText,
        captionMeta: markerDetailLine || priceText,
        captionImageUrl: markerImageUrl,
        captionImageAlt: markerListingTitle,
      };
      const fallbackMarkerIcon = createFallbackMarkerIcon(
        priceText,
        markerPreset,
        markerStyleOverrides,
        markerCaptionOptions
      );
      const hoverStyleOverrides = {
        ...markerStyleOverrides,
        borderWidth: Math.max(
          Number(markerStyleOverrides.borderWidth) || Number(markerPreset.borderWidth) || 1,
          1
        ) + 0.8,
        pinBackground: '#0f3c6d',
        pinBorderColor: '#0f3c6d',
        fontWeight: 800,
      };
      const fallbackMarkerListHoverIcon = createFallbackMarkerIcon(
        priceText,
        markerPreset,
        hoverStyleOverrides,
        { ...markerCaptionOptions, hoverMode: 'list', scale: 1.15 }
      );
      const fallbackMarkerMapHoverIcon = createFallbackMarkerIcon(
        priceText,
        markerPreset,
        hoverStyleOverrides,
        { ...markerCaptionOptions, hoverMode: 'map', scale: 1.15 }
      );
      const shouldHighlightMarker = hoveredListingId != null && String(hoveredListingId) === propertyId;
      const marker = L.marker([coords.lat, coords.lng], {
        title: safeText(item.property.title) || item.addressQuery,
        icon: shouldHighlightMarker ? fallbackMarkerListHoverIcon : fallbackMarkerIcon,
      });
      const listingHref = `${window.location.origin}/properties/${encodeURIComponent(String(item.propertyId || ''))}`;
      marker.bindPopup(buildMarkerPopupCardHtml({
        href: listingHref,
        title: markerListingTitle,
        price: priceText,
        detailLine: markerDetailLine || item.addressQuery,
        imageUrl: markerImageUrl,
        ctaLabel: t('map.infoWindowCta'),
      }), {
        minWidth: 270,
        maxWidth: 286,
      });
      marker.on('click', () => {
        marker.openPopup();
      });
      marker.addTo(map);
      const markerEntry = {
        marker,
        propertyId,
        fallbackMarkerIcon,
        fallbackMarkerListHoverIcon,
        fallbackMarkerMapHoverIcon,
        isMapHovered: false,
        activeIconVariant: shouldHighlightMarker ? 'list' : 'default',
        cleanupHoverListeners: null,
      };
      const handleMarkerMouseOver = () => {
        markerEntry.isMapHovered = true;
        applyFallbackMarkerHoverVisualState(markerEntry);
      };
      const handleMarkerMouseOut = () => {
        markerEntry.isMapHovered = false;
        applyFallbackMarkerHoverVisualState(markerEntry);
      };
      marker.on('mouseover', handleMarkerMouseOver);
      marker.on('mouseout', handleMarkerMouseOut);
      const markerDomElement = typeof marker.getElement === 'function' ? marker.getElement() : null;
      if (markerDomElement) {
        markerDomElement.addEventListener('mouseenter', handleMarkerMouseOver);
        markerDomElement.addEventListener('mouseleave', handleMarkerMouseOut);
        markerDomElement.addEventListener('focusin', handleMarkerMouseOver);
        markerDomElement.addEventListener('focusout', handleMarkerMouseOut);
      }
      markerEntry.cleanupHoverListeners = () => {
        marker.off('mouseover', handleMarkerMouseOver);
        marker.off('mouseout', handleMarkerMouseOut);
        if (markerDomElement) {
          markerDomElement.removeEventListener('mouseenter', handleMarkerMouseOver);
          markerDomElement.removeEventListener('mouseleave', handleMarkerMouseOut);
          markerDomElement.removeEventListener('focusin', handleMarkerMouseOver);
          markerDomElement.removeEventListener('focusout', handleMarkerMouseOut);
        }
      };
      markersRef.current.push(markerEntry);
      applyFallbackMarkerHoverVisualState(markerEntry);
      bounds.push([coords.lat, coords.lng]);
    });

    window.setTimeout(() => {
      if (!mapInstanceRef.current) return;
      map.invalidateSize();
      setTotalMarkerCount(markersRef.current.length);
      if (!hasInitializedViewportRef.current) {
        if (bounds.length > 1) {
          map.fitBounds(bounds, { padding: [36, 36] });
        } else if (bounds.length === 1) {
          map.setView(bounds[0], 13);
        } else {
          map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 10);
        }
        hasInitializedViewportRef.current = true;
      }
      applyCircleFilter();
    }, 0);
  }, [markerPreset, propertiesWithAddress, favoritePropertyIdSet, locale, t]);

  useEffect(() => {
    markersRef.current.forEach((entry) => {
      applyFallbackMarkerHoverVisualState(entry);
    });
  }, [hoveredListingId]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isVisible) return undefined;
    const rafId = window.requestAnimationFrame(() => {
      const currentCenter = typeof map.getCenter === 'function' ? map.getCenter() : null;
      const currentZoom = typeof map.getZoom === 'function' ? map.getZoom() : null;
      map.invalidateSize();
      if (currentCenter && Number.isFinite(currentZoom)) {
        map.setView(currentCenter, currentZoom, { animate: false });
      }
      applyCircleFilter();
    });
    return () => {
      if (typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isVisible]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapContainerRef.current) return undefined;
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
  }, [touchLikeUiMode]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const activeCircle = activeCircleRef.current;
    if (!map || !activeCircle || drawMode || !touchLikeUiMode) return undefined;
    const container = map.getContainer();
    let draggingCircle = false;

    const getLatLngFromEvent = (event) => {
      if (!event || !map) return null;
      if (event.latlng) return event.latlng;
      const touch = event.touches && event.touches[0]
        ? event.touches[0]
        : event.changedTouches && event.changedTouches[0]
          ? event.changedTouches[0]
          : null;
      if (!touch) return null;
      const rect = container.getBoundingClientRect();
      const point = L.point(touch.clientX - rect.left, touch.clientY - rect.top);
      return map.containerPointToLatLng(point);
    };

    const startDragAt = (latLng, nativeEvent) => {
      if (!latLng || !activeCircleRef.current) return;
      const radius = Number(activeCircleRef.current.getRadius());
      const distance = map.distance(latLng, activeCircleRef.current.getLatLng());
      if (!Number.isFinite(radius) || distance > radius) return;
      draggingCircle = true;
      if (nativeEvent) {
        nativeEvent.preventDefault();
        nativeEvent.stopPropagation();
      }
      if (map.dragging) map.dragging.disable();
      if (map.doubleClickZoom) map.doubleClickZoom.disable();
      activeCircleRef.current.setLatLng(latLng);
      applyCircleFilter();
    };

    const continueDragAt = (latLng, nativeEvent) => {
      if (!draggingCircle || !latLng || !activeCircleRef.current) return;
      if (nativeEvent) {
        nativeEvent.preventDefault();
        nativeEvent.stopPropagation();
      }
      activeCircleRef.current.setLatLng(latLng);
      applyCircleFilter();
    };

    const endDrag = (nativeEvent) => {
      if (!draggingCircle) return;
      draggingCircle = false;
      if (nativeEvent) {
        nativeEvent.preventDefault();
        nativeEvent.stopPropagation();
      }
      if (!drawMode) {
        if (map.dragging) map.dragging.enable();
        if (map.doubleClickZoom) map.doubleClickZoom.enable();
      }
      applyCircleFilter();
    };

    const onMouseDown = (event) => startDragAt(getLatLngFromEvent(event), event.originalEvent || null);
    const onMouseMove = (event) => continueDragAt(getLatLngFromEvent(event), event.originalEvent || null);
    const onMouseUp = (event) => endDrag(event && event.originalEvent ? event.originalEvent : null);
    const onTouchStart = (event) => startDragAt(getLatLngFromEvent(event), event);
    const onTouchMove = (event) => continueDragAt(getLatLngFromEvent(event), event);
    const onTouchEnd = (event) => endDrag(event);

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
    container.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    container.addEventListener('touchend', onTouchEnd, { passive: false, capture: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: false, capture: true });

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      container.removeEventListener('touchstart', onTouchStart, { capture: true });
      container.removeEventListener('touchmove', onTouchMove, { capture: true });
      container.removeEventListener('touchend', onTouchEnd, { capture: true });
      container.removeEventListener('touchcancel', onTouchEnd, { capture: true });
      if (!drawMode) {
        if (map.dragging) map.dragging.enable();
        if (map.doubleClickZoom) map.doubleClickZoom.enable();
      }
    };
  }, [drawMode, hasActiveCircle, touchLikeUiMode]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return undefined;
    const touchLikeDrawMode = isMobileOverlay || isCoarsePointerDevice();
    let isDraftDrawing = false;
    if (!drawMode) {
      setActiveCircleInteractive(true);
      pendingCenterRef.current = null;
      lastPointerLatLngRef.current = null;
      lastCompletionTimestampRef.current = 0;
      if (map.dragging) map.dragging.enable();
      if (map.doubleClickZoom) map.doubleClickZoom.enable();
      return undefined;
    }

    setActiveCircleInteractive(false);
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
      isDraftDrawing = true;
      activeCircleRef.current = L.circle(latLng, {
        radius: MIN_CIRCLE_RADIUS_METERS,
        color: '#0e8a88',
        fillColor: '#0e8a88',
        fillOpacity: 0.16,
        weight: 2,
        interactive: false,
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
      isDraftDrawing = false;
      pendingCenterRef.current = null;
      lastPointerLatLngRef.current = null;
      lastCompletionTimestampRef.current = Date.now();
      setActiveCircleInteractive(true);
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

    if (touchLikeDrawMode) {
      map.on('touchmove', onPointerMove);
      map.on('click', onTapFallback);
      map.on('mousemove', onPointerMove);
      // In touch mode, complete only on explicit second tap to avoid one-tap min-radius circles.
    } else {
      map.on('mousemove', onPointerMove);
      map.on('mousedown', onPointerDown);
      map.on('mouseup', completeDraftCircle);
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
      isDraftDrawing = false;
      map.off('mousemove', onPointerMove);
      map.off('mousedown', onPointerDown);
      map.off('mouseup', completeDraftCircle);
      map.off('touchmove', onPointerMove);
      map.off('click', onTapFallback);
      window.removeEventListener('mouseup', completeDraftFromWindow, true);
      window.removeEventListener('pointerup', completeDraftFromWindow, true);
      window.removeEventListener('blur', completeDraftFromWindow);
      if (map.dragging) map.dragging.enable();
      if (map.doubleClickZoom) map.doubleClickZoom.enable();
    };
  }, [drawMode, isMobileOverlay]);

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
          className={`google-listings-map-canvas connected-map-fallback-canvas map-viewport ${drawMode ? 'is-drawing' : ''}`}
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
        {statusNotice ? <span className="google-listings-map-status-notice">{statusNotice}</span> : null}
        {hasActiveCircle
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

export default ConnectedListingsMapFallback;
