/**
 * GoogleListingsMap.js
 * Map component — path: frontend/src/components/GoogleListingsMap.js
 *
 * Changes vs. original:
 * - Added `isRoommatesMode` prop (default false).
 * - In roommates mode, listings arrive with lat/lng already attached
 *   (saved by the wizard via geocodeController) so the live-geocode path
 *   is skipped entirely — no redundant API calls, pins appear instantly.
 * - Roommate pins render in teal (#2d6b5e) so searchers can distinguish
 *   them from black Rent/Sale pins at a glance.
 * - Popup card link points to /roommates/:id instead of /properties/:id.
 * - Pin title built from address fields (roommate listings have no .title).
 * - rentShare field checked first for price (roommate schema), then price.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import MapAreaControls from './MapAreaControls';
import { getPropertyId } from '../utils/propertyIdentity';
import { useLanguage } from '../context/LanguageContext';
import { buildAddressQuery } from '../utils/addressLocalization';
import { getPublicConfigValue } from '../utils/publicConfig';

const MAP_SCRIPT_ID = 'homekey-google-maps-platform-script';
const MAP_AUTH_FAILURE_EVENT = 'homekey-google-maps-auth-failure';
const GEO_CACHE_KEY = 'homekey:google-geocode-cache:v1';
const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 };
const MAX_MARKERS = 40;
const MIN_CIRCLE_RADIUS_METERS = 80;
const TOUCH_MIN_CIRCLE_RADIUS_METERS = 650;
const EARTH_RADIUS_METERS = 6371000;
const ZOOM_STEP = 1;
const BRAND_CHARCOAL = '#1A1A1A';
const MOBILE_OVERLAY_QUERY = '(max-width: 767px)';
const DESKTOP_MARKER_HOVER_SCALE = 1.12;
const ASPIRATIONAL_MUTED_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f3efe7' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6f6a61' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f8f5ef' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#d7d0c4' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#eee6d8' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#e8dfcf' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#dce6d8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#ded7cc' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f6f2eb' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e5dac9' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#cfc4b3' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#8f877c' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#c9d7d9' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#71868a' }] },
];

const FAVORITE_PRICE_PIN_STYLE = {
  pinColor: '#FF0000', pinStrokeColor: '#000000', strokeWidth: 0.9,
  textColor: '#FFFFFF', fontWeight: 700,
};
// Teal pins for roommate listings — visually distinct from black Rent/Sale pins.
const ROOMMATE_PRICE_PIN_STYLE = {
  pinColor: '#2d6b5e', pinStrokeColor: '#1f4f44', strokeWidth: 1,
  textColor: '#ffffff', fontWeight: 700,
};

const MARKER_STYLE_PRESETS = {
  minimal: {
    label: 'Minimal', markerMode: 'pricePin', minWidth: 46, pinHeight: 21,
    pointerHeight: 7, horizontalPadding: 7, fontSize: 10, fontWeight: 600,
    pinColor: BRAND_CHARCOAL, pinStrokeColor: BRAND_CHARCOAL, textColor: '#ffffff',
  },
  house: {
    label: 'House Pins', markerMode: 'house', iconWidth: 19, iconHeight: 27,
    pinColor: '#2563eb', pinStrokeColor: '#1d4ed8', homeStrokeColor: '#ffffff',
  },
  medium: {
    label: 'Medium', markerMode: 'pricePin', minWidth: 52, pinHeight: 24,
    pointerHeight: 9, horizontalPadding: 8, fontSize: 11, fontWeight: 600,
    pinColor: '#2b3440', pinStrokeColor: '#2b3440', textColor: '#ffffff',
  },
  bold: {
    label: 'Bold', markerMode: 'pricePin', minWidth: 56, pinHeight: 26,
    pointerHeight: 10, horizontalPadding: 9, fontSize: 11, fontWeight: 700,
    pinColor: BRAND_CHARCOAL, pinStrokeColor: BRAND_CHARCOAL, textColor: '#ffffff',
  },
};
const DEFAULT_MARKER_PRESET_KEY = 'minimal';
const DEFAULT_MAP_LANGUAGE = 'en';
const MAP_LANGUAGE_SET = new Set(['en', 'he']);

let googleMapsLoadPromise;
let googleMapsLoadedLanguage = null;
let googleMapsRequestedLanguage = null;
let googleMapsAuthFailureHookInstalled = false;

const safeText = (value) => (typeof value === 'string' ? value.trim() : '');
const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const readGeocodeCache = () => {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(GEO_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_err) { return {}; }
};

const writeGeocodeCache = (cacheObj) => {
  if (typeof window === 'undefined' || !window.localStorage || !cacheObj) return;
  try {
    const entries = Object.entries(cacheObj).slice(-500);
    window.localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch (_err) {}
};

const resolveMapLanguage = (language) => (MAP_LANGUAGE_SET.has(language) ? language : DEFAULT_MAP_LANGUAGE);

const dispatchMapAuthFailureEvent = () => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new Event(MAP_AUTH_FAILURE_EVENT));
};

const ensureGoogleMapsAuthFailureHook = () => {
  if (typeof window === 'undefined' || googleMapsAuthFailureHookInstalled) return;
  const prior = typeof window.gm_authFailure === 'function' ? window.gm_authFailure : null;
  window.gm_authFailure = (...args) => {
    if (prior) { try { prior(...args); } catch (_err) {} }
    dispatchMapAuthFailureEvent();
  };
  googleMapsAuthFailureHookInstalled = true;
};

const loadGoogleMaps = (apiKey, requestedLanguage = DEFAULT_MAP_LANGUAGE) => {
  if (!apiKey) return Promise.reject(new Error('Missing Google Maps API key.'));
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Maps can only load in the browser.'));
  ensureGoogleMapsAuthFailureHook();
  const mapLanguage = resolveMapLanguage(requestedLanguage);
  if (window.google && window.google.maps && googleMapsLoadedLanguage === mapLanguage) {
    return Promise.resolve(window.google.maps);
  }
  if (googleMapsLoadPromise && googleMapsRequestedLanguage === mapLanguage) return googleMapsLoadPromise;
  if (googleMapsLoadedLanguage && googleMapsLoadedLanguage !== mapLanguage) {
    const existing = document.getElementById(MAP_SCRIPT_ID);
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    if (window.google) { try { delete window.google; } catch (_err) { window.google = undefined; } }
    googleMapsLoadedLanguage = null;
    googleMapsLoadPromise = undefined;
  }
  googleMapsLoadPromise = new Promise((resolve, reject) => {
    googleMapsRequestedLanguage = mapLanguage;
    const existingScript = document.getElementById(MAP_SCRIPT_ID);
    const desiredLanguageParam = `language=${encodeURIComponent(mapLanguage)}`;
    if (existingScript) {
      const src = String(existingScript.getAttribute('src') || '');
      if (src.includes(desiredLanguageParam)) {
        if (window.google && window.google.maps) {
          googleMapsLoadedLanguage = mapLanguage; googleMapsRequestedLanguage = null;
          resolve(window.google.maps); return;
        }
        existingScript.addEventListener('load', () => { googleMapsLoadedLanguage = mapLanguage; googleMapsRequestedLanguage = null; resolve(window.google && window.google.maps); });
        existingScript.addEventListener('error', () => { googleMapsRequestedLanguage = null; reject(new Error('Failed to load Google Maps script.')); });
        return;
      }
      existingScript.remove();
    }
    const script = document.createElement('script');
    script.id = MAP_SCRIPT_ID; script.async = true; script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&language=${encodeURIComponent(mapLanguage)}&region=IL`;
    script.onload = () => { googleMapsLoadedLanguage = mapLanguage; googleMapsRequestedLanguage = null; resolve(window.google && window.google.maps); };
    script.onerror = () => { googleMapsRequestedLanguage = null; reject(new Error('Failed to load Google Maps script.')); };
    document.head.appendChild(script);
  });
  return googleMapsLoadPromise;
};

const geocodeAddress = (geocoder, address) => new Promise((resolve) => {
  geocoder.geocode({ address }, (results, status) => {
    if (status !== 'OK' || !results || !results[0] || !results[0].geometry || !results[0].geometry.location) { resolve(null); return; }
    const loc = results[0].geometry.location;
    resolve({ lat: loc.lat(), lng: loc.lng() });
  });
});

const toRadians = (value) => (Number(value) * Math.PI) / 180;

const getDistanceMeters = (a, b) => {
  if (!a || !b) return Infinity;
  const lat1 = Number(a.lat); const lng1 = Number(a.lng);
  const lat2 = Number(b.lat); const lng2 = Number(b.lng);
  if ([lat1, lng1, lat2, lng2].some((v) => Number.isNaN(v))) return Infinity;
  const dLat = toRadians(lat2 - lat1); const dLng = toRadians(lng2 - lng1);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

// Cluster pins that are too close to read individually at a given zoom level.
// At high zoom the threshold is 0 so every pin shows individually; at low
// zoom nearby pins merge into a single count bubble.
const CLUSTER_THRESHOLD_METERS = {
  8: 18000, 9: 9000, 10: 4500, 11: 2200, 12: 1100,
};
const CLUSTER_ZOOM_THRESHOLD = 13; // zoom ≥ 13 → no clustering

const clusterItems = (items, zoom) => {
  if (zoom >= CLUSTER_ZOOM_THRESHOLD) return items.map((item) => ({ isCluster: false, item }));
  const thresholdMeters = CLUSTER_THRESHOLD_METERS[zoom] || CLUSTER_THRESHOLD_METERS[10];
  const used = new Set();
  const result = [];
  for (let i = 0; i < items.length; i++) {
    if (used.has(i)) continue;
    const group = [items[i]];
    used.add(i);
    for (let j = i + 1; j < items.length; j++) {
      if (used.has(j)) continue;
      if (getDistanceMeters(items[i].coords, items[j].coords) <= thresholdMeters) {
        group.push(items[j]);
        used.add(j);
      }
    }
    if (group.length === 1) {
      result.push({ isCluster: false, item: group[0] });
    } else {
      const lat = group.reduce((s, g) => s + g.coords.lat, 0) / group.length;
      const lng = group.reduce((s, g) => s + g.coords.lng, 0) / group.length;
      result.push({ isCluster: true, count: group.length, coords: { lat, lng }, items: group });
    }
  }
  return result;
};

const getMarkerImageUrl = (property, propertyId) => {
  const imgs = property && Array.isArray(property.images) ? property.images : [];
  const candidates = [...imgs, property?.mainImage, property?.image, property?.imageUrl, property?.thumbnail];
  const first = candidates.find((u) => typeof u === 'string' && u.trim());
  if (first) return first.trim();
  return `https://picsum.photos/seed/homekey-map-marker-${encodeURIComponent(String(propertyId || 'listing'))}/120/120`;
};

const getMarkerStylePreset = (key) => MARKER_STYLE_PRESETS[key] || MARKER_STYLE_PRESETS[DEFAULT_MARKER_PRESET_KEY];

const GoogleMapsUnavailableState = ({ title, message }) => (
  <div className="google-listings-map-shell google-listings-map-shell--unavailable">
    <div className="google-listings-map-unavailable-card" role="status" aria-live="polite">
      <div className="google-listings-map-unavailable-icon" aria-hidden="true">G</div>
      <div><h2>{title}</h2><p>{message}</p></div>
    </div>
  </div>
);

const formatMarkerPrice = (price, locale = 'en-US', unavailableLabel = 'N/A') => {
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) return unavailableLabel;
  return `₪${n.toLocaleString(locale)}`;
};

const toMarkerRoomCount = (property = {}) => {
  const candidates = [property.totalBedrooms, property.rooms, property.bedrooms, property.roomCount];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
};

const buildMarkerDetailLine = (property = {}, addressQuery = '') => {
  const roomCount = toMarkerRoomCount(property);
  const roomLabel = roomCount ? `${roomCount} Rooms` : '';
  const neighborhood = safeText(property?.address?.city || property?.neighborhood || (addressQuery || '').split(',')[0]);
  const neighborhoodLabel = neighborhood ? neighborhood.toUpperCase() : '';
  return [roomLabel, neighborhoodLabel].filter(Boolean).join(' | ');
};

// Roommate listings have no .title — build one from address fields instead.
const getMarkerTitle = (property = {}, isRoommatesMode = false) => {
  if (!isRoommatesMode) return safeText(property.title);
  const addr = property.address && typeof property.address === 'object' ? property.address : {};
  const street = [safeText(addr.street), safeText(addr.streetNumber)].filter(Boolean).join(' ');
  const neighborhood = safeText(addr.neighborhood);
  return [street, neighborhood].filter(Boolean).join(', ');
};

const buildMarkerPopupCardHtml = ({ href = '', title = '', price = '', detailLine = '', imageUrl = '', ctaLabel = '' }) => {
  const h = escapeHtml;
  return `<a href="${h(href || '#')}" style="display:block;width:252px;padding:12px;border:1px solid #dde3ea;border-radius:14px;background:#ffffff;color:#0f172a;text-decoration:none;font-family:Inter,Roboto,'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;box-shadow:0 12px 26px rgba(15,23,42,0.14);">
    <div style="display:flex;flex-direction:column;gap:4px;margin:0 0 10px;">
      <p style="margin:0;font-size:15px;font-weight:800;line-height:1.2;color:#0f172a;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${h(title || 'Listing')}</p>
      <p style="margin:0;font-size:31px;font-weight:700;line-height:1;color:#111827;" dir="ltr">${h(price || '')}</p>
      <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.01em;color:#334155;">${h(detailLine || '')}</p>
    </div>
    <div style="border:1px solid #111111;border-radius:12px;padding:2px;box-shadow:inset 0 0 0 1px rgba(15,23,42,0.2);background:#ffffff;overflow:hidden;">
      <img src="${h(imageUrl || '')}" alt="${h(title || 'Listing')}" style="display:block;width:100%;height:128px;object-fit:cover;border-radius:9px;" />
    </div>
    <div style="margin-top:10px;font-size:15px;font-weight:700;color:#0e8a88;">${h(ctaLabel || 'View')} &#8250;</div>
  </a>`;
};

const createListingMarkerElement = (priceText, details = {}, isFavorite = false) => {
  if (typeof document === 'undefined') return null;
  const d = details && typeof details === 'object' ? details : {};
  const el = document.createElement('div');
  el.className = 'map-listing-marker radar-container';
  const pulse = document.createElement('span');
  pulse.className = 'radar-pulse-ring faint-radar-rings';
  el.appendChild(pulse);
  if (isFavorite) el.classList.add('is-favorite');
  const pin = document.createElement('span');
  pin.className = 'map-listing-marker-pin';
  pin.textContent = priceText;
  el.appendChild(pin);
  const caption = document.createElement('div');
  caption.className = 'map-hovered-listing-caption animate-fadeIn animate-luxury-card';
  const textCard = document.createElement('div');
  textCard.className = 'map-hovered-listing-caption__text-card';
  const titleEl = document.createElement('p'); titleEl.className = 'map-hovered-listing-caption__title'; titleEl.textContent = safeText(d.title) || 'Listing';
  const priceEl = document.createElement('p'); priceEl.className = 'map-hovered-listing-caption__price'; priceEl.textContent = safeText(d.priceLine) || priceText;
  const metaEl = document.createElement('p'); metaEl.className = 'map-hovered-listing-caption__meta'; metaEl.textContent = safeText(d.detailLine) || priceText;
  textCard.appendChild(titleEl); textCard.appendChild(priceEl); textCard.appendChild(metaEl);
  const imgCard = document.createElement('div'); imgCard.className = 'map-hovered-listing-caption__image-card';
  const img = document.createElement('img'); img.className = 'map-hovered-listing-caption__image';
  img.src = safeText(d.imageUrl) || getMarkerImageUrl({}, d.title || 'listing');
  img.alt = safeText(d.imageAlt || d.title) || 'Listing'; img.decoding = 'async'; img.loading = 'lazy';
  imgCard.appendChild(img);
  caption.appendChild(textCard); caption.appendChild(imgCard);
  el.appendChild(caption);
  return el;
};

const createPricePinIcon = (mapsApi, preset, priceText, scale = 1, styleOverrides = {}, options = {}) => {
  const pinHeight = Number(preset.pinHeight) || 26;
  const pointerHeight = Number(preset.pointerHeight) || 10;
  const horizontalPadding = Number(preset.horizontalPadding) || 10;
  const minWidth = Number(preset.minWidth) || 56;
  const fontSize = Number(preset.fontSize) || 12;
  const so = styleOverrides && typeof styleOverrides === 'object' ? styleOverrides : {};
  const opts = options && typeof options === 'object' ? options : {};
  const showRadarPulse = Boolean(opts.showRadarPulse);
  const pulsePhase = Number(opts.pulsePhase) || 0;
  const fontWeight = Number(so.fontWeight) || Number(preset.fontWeight) || 700;
  const pinColor = so.pinColor || preset.pinColor || '#2563eb';
  const pinStrokeColor = so.pinStrokeColor || preset.pinStrokeColor || '#1d4ed8';
  const strokeWidth = Number(so.strokeWidth) || 1;
  const textColor = so.textColor || preset.textColor || '#ffffff';
  const safe = escapeHtml(priceText);
  const estimatedTextWidth = Math.ceil(safe.length * fontSize * 0.62);
  const bubbleWidth = Math.max(minWidth, estimatedTextWidth + (horizontalPadding * 2));
  const totalHeight = pinHeight + pointerHeight;
  const radius = Math.round(pinHeight / 2);
  const centerX = bubbleWidth / 2;
  const pointerHalfWidth = Math.max(5, Math.round(bubbleWidth * 0.12));
  const textY = Math.round((pinHeight / 2) + (fontSize * 0.36));
  const hs = strokeWidth / 2;
  const leftX = hs; const rightX = bubbleWidth - hs; const topY = hs;
  const bubbleBottomY = pinHeight - hs; const tipY = totalHeight - hs;
  const safeRadius = Math.max(1, radius - hs);
  const pLeftX = centerX - pointerHalfWidth; const pRightX = centerX + pointerHalfWidth;
  const radarPadding = showRadarPulse ? 66 : 0;
  const iconWidth = bubbleWidth + (radarPadding * 2);
  const iconHeight = totalHeight + (radarPadding * 2);
  const rCX = centerX + radarPadding; const rCY = Math.round((pinHeight / 2) + radarPadding);
  const radarRadii = pulsePhase % 2 === 0 ? [22, 38, 54] : [26, 44, 62];
  const radarMarkup = showRadarPulse
    ? radarRadii.map((r) => `<circle cx="${rCX}" cy="${rCY}" r="${r}" fill="none" stroke="rgba(15,23,42,0.38)" stroke-width="6"/><circle cx="${rCX}" cy="${rCY}" r="${r}" fill="none" stroke="rgb(255,255,255)" stroke-width="4"/>`).join('')
    : '';
  const pinPath = [`M${leftX + safeRadius} ${topY}`, `H${rightX - safeRadius}`, `Q${rightX} ${topY} ${rightX} ${topY + safeRadius}`, `V${bubbleBottomY - safeRadius}`, `Q${rightX} ${bubbleBottomY} ${rightX - safeRadius} ${bubbleBottomY}`, `Q${pRightX} ${bubbleBottomY} ${centerX} ${tipY}`, `Q${pLeftX} ${bubbleBottomY} ${leftX + safeRadius} ${bubbleBottomY}`, `Q${leftX} ${bubbleBottomY} ${leftX} ${bubbleBottomY - safeRadius}`, `V${topY + safeRadius}`, `Q${leftX} ${topY} ${leftX + safeRadius} ${topY}`, 'Z'].join(' ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconWidth}" height="${iconHeight}" viewBox="0 0 ${iconWidth} ${iconHeight}" overflow="visible">${radarMarkup}<g transform="translate(${radarPadding},${radarPadding})"><path d="${pinPath}" fill="${pinColor}" stroke="${pinStrokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round"/><text x="${centerX}" y="${textY}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${textColor}">${safe}</text></g></svg>`;
  const safeScale = Number(scale) > 0 ? Number(scale) : 1;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new mapsApi.Size(iconWidth * safeScale, iconHeight * safeScale),
    anchor: new mapsApi.Point((centerX + radarPadding) * safeScale, (totalHeight + radarPadding) * safeScale),
  };
};

const createHousePinIcon = (mapsApi, preset) => {
  const iW = Number(preset.iconWidth) || 19; const iH = Number(preset.iconHeight) || 27;
  const pinColor = preset.pinColor || '#0e8a88'; const pinStrokeColor = preset.pinStrokeColor || '#0f766e';
  const homeStrokeColor = preset.homeStrokeColor || '#ffffff';
  const cX = iW / 2; const roofTop = 1; const eaveY = Math.round(iH * 0.4);
  const wallLeft = Math.round(iW * 0.16); const wallRight = Math.round(iW * 0.84);
  const doorW = Math.round(iW * 0.32); const doorH = Math.round(iH * 0.3);
  const doorX = Math.round(cX - doorW / 2); const doorY = iH - doorH;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${iW}" height="${iH}" viewBox="0 0 ${iW} ${iH}" overflow="visible"><path d="M${cX} ${roofTop} L0 ${eaveY} H${wallLeft} V${iH} H${wallRight} V${eaveY} H${iW} Z" fill="${pinColor}" stroke="${pinStrokeColor}" stroke-width="1" stroke-linejoin="round" stroke-linecap="round"/><rect x="${doorX}" y="${doorY}" width="${doorW}" height="${doorH}" fill="${homeStrokeColor}" rx="0.5"/></svg>`;
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, scaledSize: new mapsApi.Size(iW, iH), anchor: new mapsApi.Point(cX, iH) };
};

const isCoarsePointerDevice = () => {
  if (typeof window === 'undefined') return false;
  const mm = typeof window.matchMedia === 'function';
  if (mm && window.matchMedia('(any-pointer: fine)').matches) return false;
  if (mm && window.matchMedia('(pointer: coarse)').matches) return true;
  const tp = typeof navigator !== 'undefined' ? Number(navigator.maxTouchPoints) : 0;
  return tp > 0 && !(mm && window.matchMedia('(hover: hover)').matches);
};

const GoogleListingsMap = ({
  properties = [],
  favoritePropertyIds = [],
  onCircleSelectionChange,
  clearSignal = 0,
  drawModeToggleSignal = 0,
  onDrawModeChange,
  isVisible = true,
  hoveredListingId = null,
  isRoommatesMode = false,
}) => {
  const { t, locale, language } = useLanguage();
  const mapLanguage = language === 'he' ? 'he' : 'en';
  const apiKey = getPublicConfigValue('REACT_APP_GOOGLE_MAPS_API_KEY');
  const configuredMapId = getPublicConfigValue('REACT_APP_GOOGLE_MAPS_MAP_ID');
  const canUseAdvancedMarkers = Boolean(configuredMapId);
  const mapContainerRef = useRef(null); const mapRef = useRef(null);
  const geocoderRef = useRef(null); const infoWindowRef = useRef(null);
  const markerEntriesRef = useRef([]); const activeMapHoverEntryRef = useRef(null);
  const markerHydrationInProgressRef = useRef(false); const expectedMarkerCountRef = useRef(0);
  const hasInitializedViewportRef = useRef(false); const geocodeCacheRef = useRef(readGeocodeCache());
  const drawListenersRef = useRef([]); const activeCircleRef = useRef(null);
  const draftCircleRef = useRef(null); const hoveredListingIdRef = useRef(hoveredListingId);
  const drawStartRef = useRef(null); const lastDraftPointerRef = useRef(null);
  const clusterMarkersRef = useRef([]);
  const rebuildClustersRef = useRef(null);
  const lastCompletionTimestampRef = useRef(0); const drawToggleSignalRef = useRef(drawModeToggleSignal);
  const clearSignalInitializedRef = useRef(false);
  const [mapError, setMapError] = useState(''); const [mapReady, setMapReady] = useState(false);
  const [markerCount, setMarkerCount] = useState(0); const [totalMarkerCount, setTotalMarkerCount] = useState(0);
  const [drawMode, setDrawMode] = useState(false); const [circleRadiusMeters, setCircleRadiusMeters] = useState(0);
  const [hoverPulsePhase, setHoverPulsePhase] = useState(0);
  const [isMobileOverlay, setIsMobileOverlay] = useState(false);
  const markerPreset = getMarkerStylePreset(DEFAULT_MARKER_PRESET_KEY);
  const coarsePointerDevice = isCoarsePointerDevice();
  const touchLikeUiMode = isMobileOverlay || coarsePointerDevice;
  const overlayCardStyle = useMemo(() => ({ border: '1px solid rgba(30,41,59,0.9)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }), []);
  const favoritePropertyIdSet = useMemo(() => new Set(favoritePropertyIds.map((id) => String(id))), [favoritePropertyIds]);

  useEffect(() => { hoveredListingIdRef.current = hoveredListingId == null ? null : String(hoveredListingId); }, [hoveredListingId]);
  useEffect(() => {
    if (hoveredListingId == null || typeof window === 'undefined') { setHoverPulsePhase(0); return undefined; }
    const id = window.setInterval(() => setHoverPulsePhase((p) => (p + 1) % 2), 2200);
    return () => window.clearInterval(id);
  }, [hoveredListingId]);

  const applyMarkerHoverVisualState = (entry, pulsePhase = hoverPulsePhase) => {
    if (!entry || !entry.propertyId) return;
    const fromList = hoveredListingIdRef.current === entry.propertyId;
    const fromMap = Boolean(entry.isMapHovered);
    const hovered = fromList || fromMap;
    const elevZ = fromMap ? 120 : 100;
    if (entry.markerElement) {
      entry.markerElement.classList.toggle('is-list-hovered', fromList);
      entry.markerElement.classList.toggle('is-map-hovered', fromMap);
      entry.markerElement.classList.toggle('is-hovered', hovered);
    }
    if (entry.isAdvancedMarker) { entry.marker.zIndex = hovered ? elevZ : 2; return; }
    if (typeof entry.marker.setZIndex === 'function') entry.marker.setZIndex(hovered ? elevZ : 2);
    if (!entry.markerIcon || typeof entry.marker.setIcon !== 'function') return;
    if (entry.frameMarker) {
      if (hovered && Array.isArray(entry.markerHoverIcons) && entry.markerHoverIcons.length > 0) {
        const idx = fromList && !fromMap ? pulsePhase % entry.markerHoverIcons.length : 0;
        entry.frameMarker.setIcon(entry.markerHoverIcons[idx] || entry.markerHoverIcon);
        entry.frameMarker.setZIndex(elevZ + 1); entry.frameMarker.setMap(mapRef.current);
      } else { entry.frameMarker.setMap(null); }
      entry.marker.setIcon(entry.markerIcon); return;
    }
    if (hovered && Array.isArray(entry.markerHoverIcons) && entry.markerHoverIcons.length > 0) {
      const idx = fromList && !fromMap ? pulsePhase % entry.markerHoverIcons.length : 0;
      entry.marker.setIcon(entry.markerHoverIcons[idx] || entry.markerHoverIcon || entry.markerIcon); return;
    }
    if (hovered && entry.markerHoverIcon) { entry.marker.setIcon(entry.markerHoverIcon); return; }
    entry.marker.setIcon(entry.markerIcon);
  };

  const setActiveMapHoverEntry = (next) => {
    if (activeMapHoverEntryRef.current && activeMapHoverEntryRef.current !== next) {
      activeMapHoverEntryRef.current.isMapHovered = false;
      applyMarkerHoverVisualState(activeMapHoverEntryRef.current);
    }
    activeMapHoverEntryRef.current = next || null;
    if (next) { next.isMapHovered = true; applyMarkerHoverVisualState(next); }
  };

  const emitCircleSelection = (sel) => { if (typeof onCircleSelectionChange === 'function') onCircleSelectionChange(sel); };

  const clearDrawListeners = () => {
    drawListenersRef.current.forEach((l) => {
      if (!l) return;
      if (typeof l.remove === 'function') l.remove();
      else if (window.google && window.google.maps && window.google.maps.event) window.google.maps.event.removeListener(l);
    });
    drawListenersRef.current = [];
  };

  const getMinimumCircleRadius = (touchLike = touchLikeUiMode) => (touchLike ? TOUCH_MIN_CIRCLE_RADIUS_METERS : MIN_CIRCLE_RADIUS_METERS);

  const removeDraftCircle = () => {
    if (draftCircleRef.current) { draftCircleRef.current.setMap(null); draftCircleRef.current = null; }
    drawStartRef.current = null; lastDraftPointerRef.current = null;
  };

  const applyCircleFilter = () => {
    const map = mapRef.current; if (!map) return;
    const circ = activeCircleRef.current;
    const center = circ && circ.getCenter ? circ.getCenter() : null;
    const radiusM = circ && typeof circ.getRadius === 'function' ? Number(circ.getRadius()) : 0;
    const hasArea = Boolean(circ && center && radiusM > 0);
    const deferred = hasArea && markerHydrationInProgressRef.current && expectedMarkerCountRef.current > 0 && markerEntriesRef.current.length < expectedMarkerCountRef.current;
    const effective = hasArea && !deferred;
    const centerPt = effective ? { lat: center.lat(), lng: center.lng() } : null;
    const ids = []; let visible = 0;
    markerEntriesRef.current.forEach((e) => {
      const show = !effective || getDistanceMeters(e.coords, centerPt) <= radiusM;
      if (e.isAdvancedMarker) e.marker.map = show ? map : null;
      else if (typeof e.marker.setVisible === 'function') e.marker.setVisible(show);
      if (e.frameMarker) e.frameMarker.setVisible(show);
      if (show) { visible += 1; ids.push(e.propertyId); }
    });
    setMarkerCount(visible); setTotalMarkerCount(markerEntriesRef.current.length);
    setCircleRadiusMeters(effective ? radiusM : 0);
    emitCircleSelection({ active: effective, propertyIds: ids, radiusMeters: effective ? radiusM : 0, center: centerPt });
    if (!markerHydrationInProgressRef.current && typeof rebuildClustersRef.current === 'function') {
      rebuildClustersRef.current();
    }
  };

  const clearCircleFilter = () => {
    removeDraftCircle();
    if (activeCircleRef.current) {
      if (window.google && window.google.maps && window.google.maps.event) window.google.maps.event.clearInstanceListeners(activeCircleRef.current);
      activeCircleRef.current.setMap(null); activeCircleRef.current = null;
    }
    setDrawMode(false);
    if (mapRef.current) mapRef.current.setOptions({ draggableCursor: null, draggable: true, gestureHandling: 'greedy', disableDoubleClickZoom: false });
    applyCircleFilter();
  };

  const setActiveCircleInteractive = (interactive, touchLike = touchLikeUiMode) => {
    const circ = activeCircleRef.current;
    if (!circ || typeof circ.setOptions !== 'function') return;
    circ.setOptions({ clickable: interactive, draggable: interactive, editable: interactive && !touchLike });
  };

  // Roommate listings already have lat/lng from the wizard geocoding step —
  // skip live geocoding for them. Rent/Sale properties geocode from address.
  // RoommateListing stores coordinates at address.lat / address.lng (nested),
  // so we check both that location and the top level for safety.
  const propertiesWithAddress = useMemo(() => {
    if (isRoommatesMode) {
      return properties.map((property) => {
        const lat = Number(property?.address?.lat ?? property?.lat);
        const lng = Number(property?.address?.lng ?? property?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { property, propertyId: getPropertyId(property), coords: { lat, lng } };
      }).filter((item) => item && item.propertyId);
    }
    return properties.map((property) => ({
      property, propertyId: getPropertyId(property), addressQuery: buildAddressQuery(property.address, language),
    })).filter((item) => item.property && item.propertyId && item.addressQuery);
  }, [properties, language, isRoommatesMode]);

  useEffect(() => { if (typeof onDrawModeChange === 'function') onDrawModeChange(drawMode); }, [drawMode, onDrawModeChange]);
  useEffect(() => {
    if (drawModeToggleSignal === drawToggleSignalRef.current) return;
    drawToggleSignalRef.current = drawModeToggleSignal;
    setDrawMode((v) => !v);
  }, [drawModeToggleSignal]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(MOBILE_OVERLAY_QUERY);
    const sync = (e) => setIsMobileOverlay(Boolean(e && e.matches));
    sync(mq);
    if (typeof mq.addEventListener === 'function') { mq.addEventListener('change', sync); return () => mq.removeEventListener('change', sync); }
    mq.addListener(sync); return () => mq.removeListener(sync);
  }, []);

  useEffect(() => { emitCircleSelection({ active: false, propertyIds: [], radiusMeters: 0, center: null }); }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handle = () => { setMapReady(false); setMapError(t('map.unableToLoadMap')); };
    window.addEventListener(MAP_AUTH_FAILURE_EVENT, handle);
    return () => window.removeEventListener(MAP_AUTH_FAILURE_EVENT, handle);
  }, [t]);

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    loadGoogleMaps(apiKey, mapLanguage).then((mapsApi) => {
      if (cancelled || !mapsApi || !mapContainerRef.current) return;
      if (!mapRef.current) {
        mapRef.current = new mapsApi.Map(mapContainerRef.current, {
          center: DEFAULT_CENTER, zoom: 10, backgroundColor: '#f3efe7', styles: ASPIRATIONAL_MUTED_MAP_STYLE,
          mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
          keyboardShortcuts: true, gestureHandling: 'greedy', cameraControl: false,
          ...(canUseAdvancedMarkers ? { mapId: configuredMapId } : {}),
        });
        geocoderRef.current = new mapsApi.Geocoder();
        infoWindowRef.current = new mapsApi.InfoWindow();
      }
      setMapError(''); setMapReady(true);
    }).catch((err) => {
      if (cancelled) return;
      setMapReady(false); setMapError(err.message || t('map.unableToLoadMap'));
    });
    return () => { cancelled = true; };
  }, [apiKey, mapLanguage, t]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !geocoderRef.current || !window.google || !window.google.maps) return undefined;
    let cancelled = false;
    activeMapHoverEntryRef.current = null;
    markerEntriesRef.current.forEach((e) => {
      if (typeof e.cleanupHoverListeners === 'function') e.cleanupHoverListeners();
      if (e.isAdvancedMarker) e.marker.map = null;
      else if (typeof e.marker.setMap === 'function') e.marker.setMap(null);
      if (e.frameMarker) e.frameMarker.setMap(null);
    });
    markerEntriesRef.current = []; setMarkerCount(0); setTotalMarkerCount(0);
    const mapsApi = window.google.maps; const map = mapRef.current;
    const geocoder = geocoderRef.current; const infoWindow = infoWindowRef.current;
    const inputs = propertiesWithAddress.slice(0, MAX_MARKERS);
    markerHydrationInProgressRef.current = true; expectedMarkerCountRef.current = inputs.length;
    applyCircleFilter();

    const updateMarkers = async () => {
      const bounds = new mapsApi.LatLngBounds(); let placed = 0; let cacheChanged = false;
      let AdvancedMarkerElementCtor = null;
      if (canUseAdvancedMarkers && typeof mapsApi.importLibrary === 'function') {
        try { const lib = await mapsApi.importLibrary('marker'); if (lib && lib.AdvancedMarkerElement) AdvancedMarkerElementCtor = lib.AdvancedMarkerElement; } catch (_e) {}
      }

      for (const item of inputs) {
        if (cancelled) { markerHydrationInProgressRef.current = false; return; }

        // Roommate pins arrive with coords pre-attached; Rent/Sale need geocoding.
        let coords = item.coords || null;
        if (!coords) {
          const cacheKey = item.addressQuery.toLowerCase();
          coords = geocodeCacheRef.current[cacheKey];
          if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
            coords = await geocodeAddress(geocoder, item.addressQuery);
            if (!coords) continue;
            geocodeCacheRef.current[cacheKey] = coords; cacheChanged = true;
            await new Promise((res) => setTimeout(res, 80));
          }
        }
        if (!coords) continue;

        const propertyId = String(item.propertyId);
        const isFav = favoritePropertyIdSet.has(propertyId);
        const markerStyleOverrides = isFav ? FAVORITE_PRICE_PIN_STYLE : (isRoommatesMode ? ROOMMATE_PRICE_PIN_STYLE : {});
        const priceValue = isRoommatesMode ? (item.property.rentShare ?? item.property.price) : item.property.price;
        const markerPrice = formatMarkerPrice(priceValue, locale, t('map.priceUnavailable'));
        const markerTitle = getMarkerTitle(item.property, isRoommatesMode) || t('map.propertyListing');
        const detailLine = buildMarkerDetailLine(item.property, item.addressQuery || '');
        const imageUrl = getMarkerImageUrl(item.property, item.propertyId);
        const isHousePinPreset = markerPreset.markerMode === 'house';
        const isHoveredFromList = hoveredListingIdRef.current === propertyId;
        const useAdvanced = canUseAdvancedMarkers && Boolean(AdvancedMarkerElementCtor) && !isHousePinPreset;
        const markerIcon = isHousePinPreset ? createHousePinIcon(mapsApi, markerPreset) : createPricePinIcon(mapsApi, markerPreset, markerPrice, 1, markerStyleOverrides);
        const markerHoverIcons = !isHousePinPreset ? [
          createPricePinIcon(mapsApi, markerPreset, markerPrice, DESKTOP_MARKER_HOVER_SCALE, markerStyleOverrides, { showRadarPulse: true, pulsePhase: 0 }),
          createPricePinIcon(mapsApi, markerPreset, markerPrice, DESKTOP_MARKER_HOVER_SCALE, markerStyleOverrides, { showRadarPulse: true, pulsePhase: 1 }),
        ] : [];
        const markerHoverIcon = markerHoverIcons[0] || null;
        const markerElement = useAdvanced ? createListingMarkerElement(markerPrice, { title: markerTitle, priceLine: markerPrice, detailLine, imageUrl, imageAlt: markerTitle }, isFav) : null;
        const marker = useAdvanced
          ? new AdvancedMarkerElementCtor({ map, position: coords, title: markerTitle, content: markerElement || undefined, zIndex: isHoveredFromList ? 100 : 2 })
          : new mapsApi.Marker({ map, position: coords, title: markerTitle, icon: isHoveredFromList && markerHoverIcon ? markerHoverIcon : markerIcon, zIndex: isHoveredFromList ? 100 : 2, optimized: true });
        const frameMarker = !useAdvanced && markerHoverIcon
          ? new mapsApi.Marker({ map: null, position: coords, title: '', icon: markerHoverIcon, clickable: false, optimized: false, zIndex: 121 }) : null;

        // Popup card links to the correct route for each listing type.
        const listingPath = isRoommatesMode ? 'roommates' : 'properties';
        const listingHref = `${window.location.origin}/${listingPath}/${encodeURIComponent(String(item.propertyId || ''))}`;
        const priceDisplay = priceValue != null ? `₪${Number(priceValue).toLocaleString(locale)}` : t('map.priceUnavailable');
        const popupHtml = buildMarkerPopupCardHtml({ href: listingHref, title: markerTitle, price: priceDisplay, detailLine: detailLine || (item.addressQuery || ''), imageUrl, ctaLabel: t('map.infoWindowCta') });
        const openSummary = () => {
          infoWindow.setOptions({ maxWidth: 286 }); infoWindow.setContent(popupHtml);
          if (useAdvanced) infoWindow.open({ map, anchor: marker }); else infoWindow.open(map, marker);
        };
        marker.addListener('click', openSummary);

        const entry = { marker, frameMarker, propertyId, coords, markerElement, isAdvancedMarker: useAdvanced, markerIcon, markerHoverIcon, markerHoverIcons, isMapHovered: false, cleanupHoverListeners: null, openMarkerSummary: openSummary };

        if (markerElement) {
          const onEnter = () => { setActiveMapHoverEntry(entry); openSummary(); };
          const onLeave = () => { if (activeMapHoverEntryRef.current === entry) activeMapHoverEntryRef.current = null; entry.isMapHovered = false; applyMarkerHoverVisualState(entry); };
          markerElement.addEventListener('mouseenter', onEnter); markerElement.addEventListener('mouseleave', onLeave);
          markerElement.addEventListener('focusin', onEnter); markerElement.addEventListener('focusout', onLeave);
          entry.cleanupHoverListeners = () => { markerElement.removeEventListener('mouseenter', onEnter); markerElement.removeEventListener('mouseleave', onLeave); markerElement.removeEventListener('focusin', onEnter); markerElement.removeEventListener('focusout', onLeave); };
        } else if (markerHoverIcon && !useAdvanced) {
          const ov = marker.addListener('mouseover', () => { setActiveMapHoverEntry(entry); openSummary(); });
          const ou = marker.addListener('mouseout', () => { if (activeMapHoverEntryRef.current === entry) activeMapHoverEntryRef.current = null; entry.isMapHovered = false; applyMarkerHoverVisualState(entry); });
          entry.cleanupHoverListeners = () => { if (ov && typeof ov.remove === 'function') ov.remove(); if (ou && typeof ou.remove === 'function') ou.remove(); };
        }

        markerEntriesRef.current.push(entry);
        applyMarkerHoverVisualState(entry, hoverPulsePhase);
        if (activeCircleRef.current) applyCircleFilter();
        bounds.extend(coords); placed += 1;
      }

      if (cacheChanged) writeGeocodeCache(geocodeCacheRef.current);
      if (!hasInitializedViewportRef.current) {
        if (placed === 1 && markerEntriesRef.current[0]) { map.setCenter(markerEntriesRef.current[0].coords); map.setZoom(13); }
        else if (placed > 1) map.fitBounds(bounds, 42);
        else { map.setCenter(DEFAULT_CENTER); map.setZoom(10); }
        hasInitializedViewportRef.current = true;
      }
      markerHydrationInProgressRef.current = false; applyCircleFilter();
    };

    updateMarkers();

    // ── Clustering ─────────────────────────────────────────────────────────
    // Defined here so it closes over mapsApi/map and can be stored in a ref
    // for the zoom_changed listener to always call the current version.
    const rebuildClusters = () => {
      if (!window.google || !window.google.maps || !mapRef.current) return;
      if (markerHydrationInProgressRef.current) return;

      // Clear old cluster bubbles
      clusterMarkersRef.current.forEach(cm => { if (typeof cm.setMap === 'function') cm.setMap(null); });
      clusterMarkersRef.current = [];

      // When circle filter is active it manages visibility — skip clustering
      if (activeCircleRef.current) return;

      const zoom = typeof map.getZoom === 'function' ? Number(map.getZoom()) : 10;
      const clustered = clusterItems(markerEntriesRef.current, zoom);

      // Step 1: restore all individual markers to visible
      markerEntriesRef.current.forEach(e => {
        if (e.isAdvancedMarker) e.marker.map = map;
        else if (typeof e.marker.setVisible === 'function') e.marker.setVisible(true);
        if (e.frameMarker && typeof e.frameMarker.setVisible === 'function') e.frameMarker.setVisible(true);
      });

      // Step 2: for each multi-item cluster, hide individuals and show bubble
      clustered.forEach(result => {
        if (!result.isCluster) return;

        result.items.forEach(e => {
          if (e.isAdvancedMarker) e.marker.map = null;
          else if (typeof e.marker.setVisible === 'function') e.marker.setVisible(false);
          if (e.frameMarker) e.frameMarker.setMap(null);
        });

        const count = result.count;
        const label = count > 99 ? '99+' : String(count);
        const fontSize = count > 9 ? 12 : 15;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="60" viewBox="0 0 52 60"><path d="M26 2 C13.3 2 3 12.3 3 25 C3 39.5 26 58 26 58 S49 39.5 49 25 C49 12.3 38.7 2 26 2 Z" fill="#1a1a1a" stroke="white" stroke-width="2"/><circle cx="26" cy="25" r="15" fill="white" opacity="0.15"/><text x="26" y="30.5" text-anchor="middle" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="700" fill="white">${escapeHtml(label)}</text></svg>`;

        const clusterMarker = new mapsApi.Marker({
          map,
          position: result.coords,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
            scaledSize: new mapsApi.Size(52, 60),
            anchor: new mapsApi.Point(26, 58),
          },
          zIndex: 30,
          title: `${count} listings — click to zoom in`,
        });

        clusterMarker.addListener('click', () => {
          const bounds = new mapsApi.LatLngBounds();
          result.items.forEach(e => bounds.extend(e.coords));
          map.fitBounds(bounds, 80);
        });

        clusterMarkersRef.current.push(clusterMarker);
      });
    };

    rebuildClustersRef.current = rebuildClusters;

    const zoomListener = mapsApi.event.addListener(map, 'zoom_changed', () => {
      if (typeof rebuildClustersRef.current === 'function') rebuildClustersRef.current();
    });

    return () => {
      cancelled = true; activeMapHoverEntryRef.current = null;
      markerEntriesRef.current.forEach((e) => {
        if (typeof e.cleanupHoverListeners === 'function') e.cleanupHoverListeners();
        if (e.isAdvancedMarker) e.marker.map = null; else if (typeof e.marker.setMap === 'function') e.marker.setMap(null);
        if (e.frameMarker) e.frameMarker.setMap(null);
      });
      markerEntriesRef.current = []; markerHydrationInProgressRef.current = false; expectedMarkerCountRef.current = 0;
      if (zoomListener) {
        if (typeof zoomListener.remove === 'function') zoomListener.remove();
        else if (window.google && window.google.maps && window.google.maps.event) window.google.maps.event.removeListener(zoomListener);
      }
      clusterMarkersRef.current.forEach(cm => { if (typeof cm.setMap === 'function') cm.setMap(null); });
      clusterMarkersRef.current = [];
      rebuildClustersRef.current = null;
    };
  }, [mapReady, propertiesWithAddress, markerPreset, favoritePropertyIdSet, locale, t, isRoommatesMode]);

  useEffect(() => { markerEntriesRef.current.forEach((e) => applyMarkerHoverVisualState(e, hoverPulsePhase)); }, [hoveredListingId, hoverPulsePhase]);

  useEffect(() => {
    if (!isVisible || !mapReady || !mapRef.current || !window.google || !window.google.maps) return undefined;
    const mapsApi = window.google.maps;
    const rafId = window.requestAnimationFrame(() => {
      const c = typeof mapRef.current.getCenter === 'function' ? mapRef.current.getCenter() : null;
      const z = typeof mapRef.current.getZoom === 'function' ? mapRef.current.getZoom() : null;
      mapsApi.event.trigger(mapRef.current, 'resize');
      if (c && Number.isFinite(z)) { mapRef.current.setCenter(c); mapRef.current.setZoom(z); }
      applyCircleFilter();
    });
    return () => { if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(rafId); };
  }, [isVisible, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google || !window.google.maps) return undefined;
    const mapsApi = window.google.maps; const touchLike = isMobileOverlay || isCoarsePointerDevice();
    let isDraft = false; clearDrawListeners();
    if (!drawMode) {
      removeDraftCircle(); setActiveCircleInteractive(true, touchLike);
      if (mapRef.current) mapRef.current.setOptions({ draggableCursor: null, draggable: true, gestureHandling: 'greedy', disableDoubleClickZoom: false });
      return undefined;
    }
    setActiveCircleInteractive(false, touchLike);
    mapRef.current.setOptions({ draggableCursor: null, draggable: false, gestureHandling: touchLike ? 'greedy' : 'none', disableDoubleClickZoom: true });

    const getEventPoint = (ev) => {
      if (!ev) return null;
      const lv = ev.latLng;
      if (lv) {
        const lat = typeof lv.lat === 'function' ? Number(lv.lat()) : Number(lv.lat);
        const lng = typeof lv.lng === 'function' ? Number(lv.lng()) : Number(lv.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng, latLng: ev.latLng };
      }
      const de = ev.domEvent || ev;
      const touch = (de.touches && de.touches[0]) || (de.changedTouches && de.changedTouches[0]) || null;
      const cx = touch ? touch.clientX : de.clientX; const cy = touch ? touch.clientY : de.clientY;
      if (!Number.isFinite(cx) || !Number.isFinite(cy) || !mapContainerRef.current || !mapRef.current) return null;
      const bounds = typeof mapRef.current.getBounds === 'function' ? mapRef.current.getBounds() : null;
      const ne = bounds && typeof bounds.getNorthEast === 'function' ? bounds.getNorthEast() : null;
      const sw = bounds && typeof bounds.getSouthWest === 'function' ? bounds.getSouthWest() : null;
      if (!ne || !sw) return null;
      const rect = mapContainerRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const xR = Math.min(1, Math.max(0, (cx - rect.left) / rect.width));
      const yR = Math.min(1, Math.max(0, (cy - rect.top) / rect.height));
      const n = Number(ne.lat()); const s = Number(sw.lat()); const e = Number(ne.lng()); const w = Number(sw.lng());
      const lat = n - ((n - s) * yR); const lng = w + ((e - w) * xR);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng, latLng: new mapsApi.LatLng(lat, lng) };
    };
    const suppressTouch = (ev) => {
      const de = ev && (ev.domEvent || ev);
      if (!de || typeof de.type !== 'string' || !de.type.startsWith('touch')) return;
      if (typeof de.preventDefault === 'function') de.preventDefault();
      if (typeof de.stopPropagation === 'function') de.stopPropagation();
    };
    const startDraft = (pt) => {
      if (!pt) return; removeDraftCircle();
      drawStartRef.current = { lat: pt.lat, lng: pt.lng }; lastDraftPointerRef.current = { lat: pt.lat, lng: pt.lng }; isDraft = true;
      draftCircleRef.current = new mapsApi.Circle({ map: mapRef.current, center: pt.latLng || { lat: pt.lat, lng: pt.lng }, radius: getMinimumCircleRadius(touchLike), strokeColor: '#0e8a88', strokeOpacity: 0.9, strokeWeight: 2, fillColor: '#0e8a88', fillOpacity: 0.12, clickable: false });
    };
    const updateDraft = (pt) => {
      if (!pt || !drawStartRef.current || !draftCircleRef.current) return;
      draftCircleRef.current.setRadius(Math.max(getMinimumCircleRadius(touchLike), getDistanceMeters(drawStartRef.current, { lat: pt.lat, lng: pt.lng })));
      lastDraftPointerRef.current = { lat: pt.lat, lng: pt.lng };
    };
    const completeDraft = (ev) => {
      suppressTouch(ev); const pt = getEventPoint(ev) || lastDraftPointerRef.current;
      if (pt) updateDraft(pt); if (!draftCircleRef.current) return; isDraft = false;
      if (activeCircleRef.current) { mapsApi.event.clearInstanceListeners(activeCircleRef.current); activeCircleRef.current.setMap(null); }
      activeCircleRef.current = draftCircleRef.current; draftCircleRef.current = null; drawStartRef.current = null;
      activeCircleRef.current.setOptions({ clickable: true, editable: !touchLike, draggable: true, fillOpacity: 0.16 });
      mapsApi.event.addListener(activeCircleRef.current, 'radius_changed', applyCircleFilter);
      mapsApi.event.addListener(activeCircleRef.current, 'center_changed', applyCircleFilter);
      const lock = () => { if (!touchLike || !mapRef.current) return; mapRef.current.setOptions({ draggable: false, gestureHandling: 'none', disableDoubleClickZoom: true }); };
      const unlock = () => { if (!touchLike || !mapRef.current) return; mapRef.current.setOptions({ draggable: true, gestureHandling: 'greedy', disableDoubleClickZoom: false }); };
      mapsApi.event.addListener(activeCircleRef.current, 'mousedown', lock);
      mapsApi.event.addListener(activeCircleRef.current, 'dragstart', lock);
      mapsApi.event.addListener(activeCircleRef.current, 'mouseup', unlock);
      mapsApi.event.addListener(activeCircleRef.current, 'dragend', () => { unlock(); applyCircleFilter(); });
      setDrawMode(false);
      mapRef.current.setOptions({ draggableCursor: null, draggable: true, gestureHandling: 'greedy', disableDoubleClickZoom: false });
      lastCompletionTimestampRef.current = Date.now(); applyCircleFilter();
    };
    const tapFallback = (ev) => {
      if (Date.now() - lastCompletionTimestampRef.current < 250) return;
      const pt = getEventPoint(ev); if (!pt) return;
      if (!drawStartRef.current || !draftCircleRef.current) { startDraft(pt); return; }
      completeDraft(ev);
    };
    const onDown = (ev) => { suppressTouch(ev); const pt = getEventPoint(ev); if (pt) startDraft(pt); };
    const onMove = (ev) => { suppressTouch(ev); const pt = getEventPoint(ev); if (pt) updateDraft(pt); };
    const reg = (name, fn) => { try { return mapsApi.event.addListener(mapRef.current, name, fn); } catch (_e) { return null; } };
    const regDom = (name, fn) => {
      if (!mapContainerRef.current) return null;
      mapContainerRef.current.addEventListener(name, fn, { passive: false, capture: true });
      return { remove: () => { if (mapContainerRef.current) mapContainerRef.current.removeEventListener(name, fn, true); } };
    };
    if (touchLike) {
      drawListenersRef.current = [reg('touchstart', onDown), reg('touchmove', onMove), reg('touchend', completeDraft), regDom('touchstart', onDown), regDom('touchmove', onMove), regDom('touchend', completeDraft), regDom('touchcancel', completeDraft), reg('click', tapFallback), reg('mousedown', onDown), reg('mousemove', onMove), reg('mouseup', completeDraft)].filter(Boolean);
    } else {
      drawListenersRef.current = [reg('mousedown', onDown), reg('mousemove', onMove), reg('mouseup', completeDraft)].filter(Boolean);
    }
    const finishFromWindow = () => { if (!isDraft) return; completeDraft(); };
    if (!touchLike) { window.addEventListener('mouseup', finishFromWindow, true); window.addEventListener('pointerup', finishFromWindow, true); window.addEventListener('blur', finishFromWindow); }
    return () => {
      clearDrawListeners(); isDraft = false;
      window.removeEventListener('mouseup', finishFromWindow, true); window.removeEventListener('pointerup', finishFromWindow, true); window.removeEventListener('blur', finishFromWindow);
      if (mapRef.current) mapRef.current.setOptions({ draggableCursor: null, draggable: true, gestureHandling: 'greedy', disableDoubleClickZoom: false });
    };
  }, [drawMode, isMobileOverlay, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapContainerRef.current) return undefined;
    const onCtx = (ev) => { if (touchLikeUiMode) { ev.preventDefault(); ev.stopPropagation(); } };
    const onDrag = (ev) => { if (!touchLikeUiMode) return; ev.preventDefault(); ev.stopPropagation(); };
    mapContainerRef.current.addEventListener('contextmenu', onCtx, true);
    mapContainerRef.current.addEventListener('dragstart', onDrag, true);
    return () => { if (!mapContainerRef.current) return; mapContainerRef.current.removeEventListener('contextmenu', onCtx, true); mapContainerRef.current.removeEventListener('dragstart', onDrag, true); };
  }, [mapReady, touchLikeUiMode]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google || !window.google.maps) return undefined;
    if (!touchLikeUiMode || drawMode || !activeCircleRef.current || circleRadiusMeters <= 0) return undefined;
    const mapsApi = window.google.maps; let dragging = false;
    const toLLP = (ll) => {
      if (!ll) return null;
      const lat = typeof ll.lat === 'function' ? Number(ll.lat()) : Number(ll.lat);
      const lng = typeof ll.lng === 'function' ? Number(ll.lng()) : Number(ll.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    };
    const inside = (ll) => {
      if (!activeCircleRef.current || !ll) return false;
      const cPt = toLLP(activeCircleRef.current.getCenter && activeCircleRef.current.getCenter());
      const pPt = toLLP(ll); const r = Number(activeCircleRef.current.getRadius && activeCircleRef.current.getRadius());
      if (!cPt || !pPt || !Number.isFinite(r) || r <= 0) return false;
      return getDistanceMeters(cPt, pPt) <= (r + 90);
    };
    const lock = () => { if (mapRef.current) mapRef.current.setOptions({ draggable: false, gestureHandling: 'none', disableDoubleClickZoom: true }); };
    const unlock = () => { if (mapRef.current) mapRef.current.setOptions({ draggable: true, gestureHandling: 'greedy', disableDoubleClickZoom: false }); };
    const begin = (ev) => { if (!ev || !ev.latLng || !activeCircleRef.current || !inside(ev.latLng)) return; dragging = true; lock(); activeCircleRef.current.setCenter(ev.latLng); applyCircleFilter(); if (ev.domEvent) { ev.domEvent.preventDefault(); ev.domEvent.stopPropagation(); } };
    const cont = (ev) => { if (!dragging || !ev || !ev.latLng || !activeCircleRef.current) return; activeCircleRef.current.setCenter(ev.latLng); applyCircleFilter(); if (ev.domEvent) { ev.domEvent.preventDefault(); ev.domEvent.stopPropagation(); } };
    const end = (ev) => { if (!dragging) return; dragging = false; unlock(); applyCircleFilter(); if (ev && ev.domEvent) { ev.domEvent.preventDefault(); ev.domEvent.stopPropagation(); } };
    const ls = ['mousedown','touchstart','mousemove','touchmove','mouseup','touchend','touchcancel'].map((name, i) => mapsApi.event.addListener(mapRef.current, name, [begin, begin, cont, cont, end, end, end][i]));
    return () => { ls.forEach((l) => { if (!l) return; if (typeof l.remove === 'function') l.remove(); else mapsApi.event.removeListener(l); }); unlock(); };
  }, [circleRadiusMeters, drawMode, mapReady, touchLikeUiMode]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return undefined;
    if (!touchLikeUiMode || drawMode || circleRadiusMeters <= 0) return undefined;
    mapRef.current.setOptions({ draggable: false, gestureHandling: 'none', disableDoubleClickZoom: true });
    return () => { if (mapRef.current) mapRef.current.setOptions({ draggable: true, gestureHandling: 'greedy', disableDoubleClickZoom: false }); };
  }, [circleRadiusMeters, drawMode, mapReady, touchLikeUiMode]);

  useEffect(() => {
    if (!clearSignalInitializedRef.current) { clearSignalInitializedRef.current = true; return; }
    clearCircleFilter();
  }, [clearSignal]);

  useEffect(() => () => {
    clearDrawListeners(); removeDraftCircle();
    if (activeCircleRef.current) {
      if (window.google && window.google.maps && window.google.maps.event) window.google.maps.event.clearInstanceListeners(activeCircleRef.current);
      activeCircleRef.current.setMap(null); activeCircleRef.current = null;
    }
    emitCircleSelection({ active: false, propertyIds: [], radiusMeters: 0, center: null });
  }, []);

  if (!apiKey) return <GoogleMapsUnavailableState title={t('map.googleMapsMissingKeyTitle')} message={t('map.googleMapsMissingKeyMessage')} />;
  if (mapError) return <GoogleMapsUnavailableState title={t('map.googleMapsUnavailableTitle')} message={t('map.googleMapsUnavailableMessage', { reason: mapError })} />;

  const toggleDrawMode = () => {
    setDrawMode((v) => {
      const next = !v;
      if (mapRef.current) mapRef.current.setOptions(next ? { draggableCursor: null, draggable: false, gestureHandling: 'none', disableDoubleClickZoom: true } : { draggableCursor: null, draggable: true, gestureHandling: 'greedy', disableDoubleClickZoom: false });
      return next;
    });
  };
  const adjustMapZoom = (delta) => {
    if (!mapRef.current || typeof mapRef.current.getZoom !== 'function') return;
    const z = Number(mapRef.current.getZoom()); if (!Number.isFinite(z)) return;
    mapRef.current.setZoom(z + delta);
  };

  return (
    <div className="google-listings-map-shell">
      <div className="google-listings-map-controls-layer">
        <div className="google-listings-map-overlay-info" style={overlayCardStyle}>
          <MapAreaControls drawMode={drawMode} onToggleDrawMode={toggleDrawMode} onClearArea={clearCircleFilter} clearDisabled={!drawMode && circleRadiusMeters <= 0} drawLabel={t('map.drawSearchArea')} clearLabel={t('map.clearArea')} toolbarLabel={t('map.areaControlsAriaLabel')} />
        </div>
      </div>
      <div className="google-listings-map-canvas-wrap">
        <div ref={mapContainerRef} className={`google-listings-map-canvas map-viewport ${drawMode ? 'is-drawing' : ''}`} />
        <div className="google-listings-map-zoom-overlay" aria-label={t('map.zoomControlsAriaLabel')}>
          <span className="google-listings-map-zoom-flourish" aria-hidden="true" />
          <div className="google-listings-map-zoom-controls">
            <button type="button" className="google-listings-map-zoom-btn" onClick={() => adjustMapZoom(ZOOM_STEP)} aria-label={t('map.zoomInAriaLabel')}>+</button>
            <button type="button" className="google-listings-map-zoom-btn" onClick={() => adjustMapZoom(-ZOOM_STEP)} aria-label={t('map.zoomOutAriaLabel')}>-</button>
          </div>
        </div>
      </div>
      <p className="google-listings-map-caption">
        {circleRadiusMeters > 0
          ? t('map.showingInsideRadius', { visible: markerCount, total: totalMarkerCount, radiusKm: (circleRadiusMeters / 1000).toFixed(2) })
          : markerCount > 0
            ? t('map.showingMappedListings', { visible: markerCount, listingWord: markerCount > 1 ? t('map.listingWordPlural') : t('map.listingWordSingular') })
            : t('map.mapReady')}
      </p>
    </div>
  );
};

export default GoogleListingsMap;
