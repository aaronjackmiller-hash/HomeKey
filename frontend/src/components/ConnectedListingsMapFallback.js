import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 }; // Tel Aviv
const MAX_MARKERS = 40;
const MIN_CIRCLE_RADIUS_METERS = 80;
const MOBILE_OVERLAY_QUERY = '(max-width: 767px)';
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
const getPropertyId = (property) => property && (property._id || property.id);

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

const createFallbackPriceIcon = (priceText) => L.divIcon({
  className: 'fallback-price-pin',
  html: `<span>${priceText}</span>`,
  iconSize: [72, 28],
  iconAnchor: [36, 28],
  popupAnchor: [0, -24],
});

const ConnectedListingsMapFallback = ({
  properties = [],
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
  const drawToggleSignalRef = useRef(drawModeToggleSignal);
  const clearSignalInitializedRef = useRef(false);
  const [drawMode, setDrawMode] = useState(false);
  const [markerCount, setMarkerCount] = useState(0);
  const [totalMarkerCount, setTotalMarkerCount] = useState(0);
  const [circleRadiusMeters, setCircleRadiusMeters] = useState(0);
  const [hasActiveCircle, setHasActiveCircle] = useState(false);
  const [isMobileOverlay, setIsMobileOverlay] = useState(false);
  const [isOverlayCollapsed, setIsOverlayCollapsed] = useState(false);

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
      const priceText = formatMarkerPrice(item.property.price);
      const marker = L.marker([coords.lat, coords.lng], {
        title: safeText(item.property.title) || item.addressQuery,
        icon: createFallbackPriceIcon(priceText),
      });
      marker.bindPopup(
        `<strong>${safeText(item.property.title) || 'Property listing'}</strong><br/>${priceText}<br/>${item.addressQuery}`
      );
      marker.addTo(map);
      markersRef.current.push({
        marker,
        propertyId: String(item.propertyId),
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
  }, [propertiesWithAddress]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return undefined;
    map.getContainer().style.cursor = drawMode ? 'crosshair' : '';
    if (!drawMode) {
      pendingCenterRef.current = null;
      return undefined;
    }

    const onMouseMove = (event) => {
      if (!pendingCenterRef.current || !activeCircleRef.current) return;
      const radius = Math.max(
        MIN_CIRCLE_RADIUS_METERS,
        map.distance(pendingCenterRef.current, event.latlng)
      );
      activeCircleRef.current.setRadius(radius);
    };

    const onClick = (event) => {
      if (!pendingCenterRef.current) {
        removeActiveCircle();
        pendingCenterRef.current = event.latlng;
        activeCircleRef.current = L.circle(event.latlng, {
          radius: MIN_CIRCLE_RADIUS_METERS,
          color: '#0e8a88',
          fillColor: '#0e8a88',
          fillOpacity: 0.16,
          weight: 2,
        }).addTo(map);
        return;
      }
      const radius = Math.max(
        MIN_CIRCLE_RADIUS_METERS,
        map.distance(pendingCenterRef.current, event.latlng)
      );
      activeCircleRef.current.setRadius(radius);
      pendingCenterRef.current = null;
      setDrawMode(false);
      applyCircleFilter();
    };

    map.on('mousemove', onMouseMove);
    map.on('click', onClick);

    return () => {
      map.off('mousemove', onMouseMove);
      map.off('click', onClick);
      map.getContainer().style.cursor = '';
    };
  }, [drawMode]);

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
      <div className={`google-listings-map-overlay-info ${isOverlayCollapsed ? 'is-collapsed' : ''}`}>
        <header className="google-listings-map-header">
          <div className="google-listings-map-header-top">
            <h2>Apartment Locations</h2>
            {isMobileOverlay ? (
              <button
                type="button"
                className="secondary-btn google-listings-map-collapse-btn"
                onClick={() => setIsOverlayCollapsed((value) => !value)}
              >
                {isOverlayCollapsed ? 'Expand' : 'Collapse'}
              </button>
            ) : null}
          </div>
          {!isOverlayCollapsed ? (
            <p>
              View where available apartments are located and draw a circle to filter the search area.
            </p>
          ) : null}
        </header>
        {!isOverlayCollapsed ? (
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
              Clear Area
            </button>
          </div>
        ) : null}
      </div>
      <div className="google-listings-map-canvas-wrap">
        <div ref={mapContainerRef} className="google-listings-map-canvas connected-map-fallback-canvas" />
      </div>
      <p className="google-listings-map-caption">
        {hasActiveCircle
          ? `Showing ${markerCount} of ${totalMarkerCount} mapped listings inside ${(circleRadiusMeters / 1000).toFixed(2)} km.`
          : markerCount > 0
            ? `Showing ${markerCount} mapped listing${markerCount > 1 ? 's' : ''}.`
            : 'Map is ready. Matching listing markers will appear as addresses resolve.'}
      </p>
    </div>
  );
};

export default ConnectedListingsMapFallback;
