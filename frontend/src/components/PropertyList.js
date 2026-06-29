/**
 * PropertyList.js
 * path: frontend/src/components/PropertyList.js
 *
 * Changes vs original:
 * - Added `roommateListingsForMap` state to hold roommate listings for the map.
 * - In roommates mode, the map is fed roommate listings (not Rent/Sale properties).
 * - `isRoommatesMode` prop passed to GoogleListingsMap so it uses teal pins + /roommates links.
 * - `onListingsChange` callback passed to RoommatesView to keep map data in sync.
 * - Rent/Sale and Roommate maps are completely separate — no mixing.
 * - Added CardImageCarousel for < > navigation arrows on property card images.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  getMyInstantAlertInbox,
  getProperties,
  getPublicYad2SyncStatus,
  saveMyCurrentSearchAlert,
} from '../services/api';
import GoogleListingsMap from './GoogleListingsMap';
import RoommatesView from './RoommatesView';
import './RoommatesView.css';
import SAMPLE_PROPERTIES from '../data/sampleProperties';
import {
  getInterestSummary,
  incrementHeartClickCount,
  toggleFavoriteProperty,
} from '../utils/propertyInterest';
import { getPropertyId } from '../utils/propertyIdentity';
import { getContactFirstName } from '../utils/contactMessaging';
import { writeSavedSearchContext } from '../utils/savedSearchContext';
import { useLanguage } from '../context/LanguageContext';
import { getAddressFieldVariants, getLocalizedAddress } from '../utils/addressLocalization';
import { buildYad2TopCroppedImageUrl } from '../utils/yad2ImageCrop';
import heroImage from '../assets/small_telaviv.jpg';

const MAX_AUTO_RETRIES = 4;
const RETRY_INTERVAL_MS = 5000;
const LIVE_LISTINGS_CACHE_KEY = 'homekey:live-listings-cache:v3';
const PRICE_SLIDER_MIN = 0;
const PRICE_SLIDER_MAX = 20000;
const HERO_BACKGROUND_IMAGE = heroImage;
const MOBILE_LAYOUT_BREAKPOINT = 767;
const SAVED_SEARCH_HISTORY_QUERY_KEY = 'history';
const SAVED_SEARCH_ID_QUERY_KEY = 'savedSearchId';
const SUPPORTED_ALL_FILTERS = new Set([
  '', 'newest', 'verified', 'price-low-high', 'price-high-low', 'mirpeset', 'fitness-center',
]);
const SUPPORTED_SOURCE_FILTERS = new Set([
  'all', 'live-yad2', 'yad2', 'yad2-scrape', 'scrape', 'yad2-sync', 'sync', 'manual',
]);
const LISTING_TYPE_OPTIONS = ['rental', 'sale', 'roommates'];
const PROPERTY_CATEGORY_OPTIONS = ['apartments', 'houses'];
const FEATURE_FILTER_OPTIONS = [
  'elevator', 'parking', 'pets', 'disabled-access', 'renovated', 'furnished',
  'mamad', 'oven', 'balcony', 'stovetop', 'laundry-facilities', 'in-unit-washer-dryer',
  'dishwasher',
];
const PROPERTY_CATEGORY_KEYWORDS = {
  apartments: ['apartment', 'studio', 'penthouse', 'flat', 'condo', 'דירה', 'פנטהאוז', 'סטודיו'],
  houses: ['house', 'villa', 'duplex', 'townhouse', 'cottage', 'home', 'בית', 'וילה', 'קוטג'],
};
const FEATURE_KEYWORDS = {
  elevator: ['elevator', 'lift', 'מעלית'],
  parking: ['parking', 'garage', 'carport', 'חניה', 'חניון'],
  pets: ['pets', 'pet friendly', 'dog', 'cat', 'חיות מחמד'],
  'disabled-access': ['accessible', 'wheelchair', 'disabled', 'נגיש', 'נכים'],
  renovated: ['renovated', 'newly renovated', 'refurbished', 'משופץ'],
  furnished: ['furnished', 'fully furnished', 'מרוהט'],
  mamad: ['mamad', 'security room', 'safe room', 'ממד', 'ממ״ד'],
  oven: ['oven', 'תנור'],
  balcony: ['balcony', 'terrace', 'mirpeset', 'מרפסת'],
  stovetop: ['stovetop', 'cooktop', 'hob', 'כיריים'],
  'laundry-facilities': ['laundry', 'laundry facilities', 'laundry room', 'laundromat', 'כביסה', 'חדר כביסה'],
  'in-unit-washer-dryer': ['in-unit washer', 'in unit washer', 'washer dryer', 'washer & dryer', 'washer and dryer', 'מכונת כביסה', 'מייבש'],
  dishwasher: ['dishwasher', 'מדיח'],
};

const formatCurrency = (value, locale = 'en-US') => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `₪${Number(value).toLocaleString(locale)}`;
};

const formatCardPrice = (property = {}, locale = 'en-US', unavailableLabel = 'Price unavailable') => {
  const asNumber = Number(property.price);
  if (Number.isNaN(asNumber)) return unavailableLabel;
  return `₪${asNumber.toLocaleString(locale)}`;
};

const normalizePhoneForLinks = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const cleaned = raw.replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned.slice(1);
  if (cleaned.startsWith('0')) return `972${cleaned.slice(1)}`;
  return cleaned;
};

const buildWhatsAppHref = (phone, contactName = '', listingType = '', street = '') => {
  const normalizedPhone = normalizePhoneForLinks(phone);
  if (!normalizedPhone) return '';
  const firstName = getContactFirstName(contactName) || '';
  const greeting = firstName ? `Hi ${firstName}` : 'Hi';
  const typeLabel = listingType === 'sale' ? 'property for sale'
    : listingType === 'rental' ? 'property for rent'
    : 'listing';
  const location = street ? ` at ${street}` : '';
  const message = `${greeting}, I saw your ${typeLabel}${location} on HomeKey and I'm interested.`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};

const normalizeVirtualTourUrl = (value) => {
  const raw = safeText(value);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString();
  } catch (_err) { return ''; }
};

const formatTimestamp = (isoValue) => {
  if (!isoValue) return null;
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString();
};

const formatHistoryBadgeDate = (isoValue) => {
  if (!isoValue) return '';
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString();
};

const toHistoricalMatchProperty = (alertItem = {}, index = 0) => {
  const snapshot = alertItem && typeof alertItem === 'object' && alertItem.propertySnapshot && typeof alertItem.propertySnapshot === 'object'
    ? alertItem.propertySnapshot : {};
  const sourcePropertyId = String(alertItem.propertyId || '').trim();
  const alertId = String(alertItem._id || '').trim();
  const syntheticId = sourcePropertyId ? `history:${sourcePropertyId}` : (alertId || `history-match-${index}`);
  return {
    _id: syntheticId, sourcePropertyId, isHistoricalMatch: true,
    historyMatchedAt: alertItem.createdAt || snapshot.createdAt || null,
    title: String(snapshot.title || alertItem.message || 'Saved search match').trim(),
    type: String(snapshot.type || '').trim().toLowerCase(),
    price: Number.isFinite(Number(snapshot.price)) ? Number(snapshot.price) : undefined,
    bedrooms: Number.isFinite(Number(snapshot.bedrooms)) ? Number(snapshot.bedrooms) : undefined,
    bathrooms: Number.isFinite(Number(snapshot.bathrooms)) ? Number(snapshot.bathrooms) : undefined,
    address: { city: String(snapshot.city || '').trim() },
    images: snapshot.image ? [String(snapshot.image)] : [],
    createdAt: alertItem.createdAt || snapshot.createdAt || null,
  };
};

const readCachedLiveListings = () => {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(LIVE_LISTINGS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === 'object');
  } catch (_err) { return []; }
};

const writeCachedLiveListings = (listings) => {
  if (typeof window === 'undefined' || !window.localStorage || !Array.isArray(listings)) return;
  try { window.localStorage.setItem(LIVE_LISTINGS_CACHE_KEY, JSON.stringify(listings.slice(0, 250))); }
  catch (_err) {}
};

const safeText = (value) => (typeof value === 'string' ? value.trim() : '');
const ENGLISH_LISTING_WORD_RE = /\b(the|and|with|for|in|to|from|apartment|property|rent|rental|sale|bed|bath|room|building|near|available|price|spacious|located)\b/i;
const hasHebrew = (value) => /[א-ת]/.test(String(value || ''));
const isYad2LikeListing = (property = {}) =>
  /yad2/i.test(String(property.externalSource || '')) || ['yad2-sync', 'yad2-scrape'].includes(String(property.sourceType || ''));
const isReadableImportedText = (property = {}, value) => {
  const text = safeText(value);
  if (!text) return false;
  if (hasHebrew(text)) return true;
  if (!isYad2LikeListing(property)) return true;
  return ENGLISH_LISTING_WORD_RE.test(text);
};
const sanitizeReadableText = (property = {}, value) => (isReadableImportedText(property, value) ? safeText(value) : '');

const dedupeCaseInsensitive = (values = []) => {
  const seen = new Set();
  return values.filter((value) => {
    const normalized = safeText(value);
    if (!normalized) return false;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
};

const normalizeRegionToken = (value) => safeText(value)
  .toLowerCase().replace(/[-־/]/g, ' ').replace(/\b(district|region)\b/g, ' ')
  .replace(/מחוז/g, ' ').replace(/\s+/g, ' ').trim();

const isRedundantStateForCity = (cityValue = '', stateValue = '') => {
  const city = normalizeRegionToken(cityValue); const state = normalizeRegionToken(stateValue);
  if (!city || !state) return false;
  return city === state || city.includes(state) || state.includes(city);
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const splitStreetAndNumber = (streetValue = '', explicitStreetNumber = '') => {
  let street = safeText(streetValue); let streetNumber = safeText(explicitStreetNumber);
  if (!streetNumber) {
    const lead = street.match(/^(\d+[a-zA-Zא-ת0-9\-\/]*)\s+(.+)$/);
    if (lead) { streetNumber = safeText(lead[1]); street = safeText(lead[2]); }
  }
  if (!streetNumber) {
    const trail = street.match(/^(.+?)\s+(\d+[a-zA-Zא-ת0-9\-\/]*)$/);
    if (trail) { street = safeText(trail[1]); streetNumber = safeText(trail[2]); }
  }
  if (street && streetNumber) {
    const esc = escapeRegex(streetNumber);
    street = street.replace(new RegExp(`^${esc}\\s+`, 'i'), '').replace(new RegExp(`\\s+${esc}$`, 'i'), '').trim();
  }
  return { street, streetNumber };
};

const normalizeStreetDisplay = (streetValue = '', explicitStreetNumber = '') => {
  const { street, streetNumber } = splitStreetAndNumber(streetValue, explicitStreetNumber);
  return [street, streetNumber].filter(Boolean).join(' ').trim();
};

const getAddressDisplay = (address = {}, language = 'en') => {
  const localizedAddress = getLocalizedAddress(address, language);
  const normalizedStreet = normalizeStreetDisplay(localizedAddress.street, localizedAddress.streetNumber);
  const street = language === 'en'
    ? [safeText(localizedAddress.streetNumber), safeText(localizedAddress.street)].filter(Boolean).join(' ')
    : normalizedStreet;
  const neighborhood = safeText(localizedAddress.neighborhood);
  const city = safeText(localizedAddress.city);
  const rawState = safeText(localizedAddress.state);
  const state = isRedundantStateForCity(city, rawState) ? '' : rawState;
  const zip = safeText(localizedAddress.zip);
  const nonIsraelCountry = safeText(localizedAddress.country).toLowerCase() === 'israel' ? '' : safeText(localizedAddress.country);
  const locationParts = dedupeCaseInsensitive([neighborhood, city, state, zip, nonIsraelCountry]);
  const fullAddress = [street, ...locationParts].filter(Boolean).join(', ');
  return { street, fullAddress, locationLine: locationParts.join(', ') };
};

const getPropertyAgentWhatsApp = (property = {}) => {
  const externalContact = property.externalContact && typeof property.externalContact === 'object' ? property.externalContact : {};
  const directContact = property.contact && typeof property.contact === 'object' ? property.contact : {};
  const agentContact = property.agent && typeof property.agent === 'object' && !Array.isArray(property.agent) ? property.agent : {};
  const whatsappNumber = safeText(agentContact.whatsapp || directContact.whatsapp || externalContact.whatsapp);
  return { whatsappNumber };
};

const getPropertyAgentDisplayName = (property = {}) => {
  const externalContact = property.externalContact && typeof property.externalContact === 'object' ? property.externalContact : {};
  const directContact = property.contact && typeof property.contact === 'object' ? property.contact : {};
  const agentContact = property.agent && typeof property.agent === 'object' && !Array.isArray(property.agent) ? property.agent : {};
  return safeText(agentContact.name || directContact.name || externalContact.name);
};

const dedupeRepeatingPhrase = (value) => {
  const text = safeText(value);
  if (!text) return '';
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return text;
  const maxPhraseLen = Math.min(6, Math.floor(words.length / 2));
  for (let phraseLen = maxPhraseLen; phraseLen >= 1; phraseLen -= 1) {
    const phrase = words.slice(0, phraseLen).join(' ');
    const repeated = words.join(' ').replace(new RegExp(`^(?:${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+){2,}`, 'i'), `${phrase} `).trim();
    if (repeated.length < text.length) return repeated;
  }
  return text;
};

const clampPriceValue = (value) => {
  const asNumber = Number(value);
  if (Number.isNaN(asNumber)) return PRICE_SLIDER_MIN;
  return Math.min(PRICE_SLIDER_MAX, Math.max(PRICE_SLIDER_MIN, asNumber));
};

const getInitialMobileDiscoveryView = () => {
  if (typeof window !== 'undefined' && window.innerWidth <= MOBILE_LAYOUT_BREAKPOINT) return 'list';
  return 'map';
};

const matchesRoomsSelection = (bedroomsValue, roomsSelection) => {
  const selected = safeText(roomsSelection);
  if (!selected) return true;
  const bedrooms = Number(bedroomsValue);
  if (Number.isNaN(bedrooms)) return false;
  const EPSILON = 0.001;
  const almostEqual = (l, r) => Math.abs(l - r) < EPSILON;
  if (selected.toLowerCase() === 'studio') return bedrooms < 1;
  if (selected.endsWith('+')) {
    const min = Number(selected.replace('+', ''));
    if (Number.isNaN(min)) return true;
    return bedrooms >= min;
  }
  const sel = Number(selected);
  if (Number.isNaN(sel)) return true;
  return almostEqual(bedrooms, sel);
};

const matchesBathroomsSelection = (bathroomsValue, bathroomsSelection) => {
  const selected = safeText(bathroomsSelection);
  if (!selected) return true;
  const bathrooms = Number(bathroomsValue);
  if (Number.isNaN(bathrooms)) return false;
  const EPSILON = 0.001;
  const almostEqual = (l, r) => Math.abs(l - r) < EPSILON;
  if (selected.endsWith('+')) {
    const min = Number(selected.replace('+', ''));
    if (Number.isNaN(min)) return true;
    return bathrooms >= min;
  }
  const sel = Number(selected);
  if (Number.isNaN(sel)) return true;
  return almostEqual(bathrooms, sel);
};

const matchesListingType = (property = {}, listingType = 'all') => {
  const norm = String(listingType || '').trim().toLowerCase();
  if (!norm || norm === 'all') return true;
  const propertyType = String(property?.type || '').trim().toLowerCase();
  if (norm === 'roommates') return propertyType === 'roommates' || propertyType === 'roommate' || property?.lookingForRoommates === true;
  return propertyType === norm;
};

const toNumericCount = (...values) => {
  for (const value of values) {
    if (value == null || value === '') continue;
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber)) return asNumber;
  }
  return null;
};

const getBedroomCount = (property = {}) => toNumericCount(property.bedrooms, property.rooms, property.roomCount);
const getBathroomCount = (property = {}) => toNumericCount(property.bathrooms, property.baths, property.bathroomCount, property.numberOfBathrooms);

const normalizeAllFiltersValue = (value) => {
  const norm = String(value || '').trim().toLowerCase();
  return SUPPORTED_ALL_FILTERS.has(norm) ? norm : '';
};

const normalizeSourceFilterValue = (value) => {
  const norm = String(value || '').trim().toLowerCase();
  if (!norm) return 'live-yad2';
  return SUPPORTED_SOURCE_FILTERS.has(norm) ? norm : 'live-yad2';
};

const getPropertyAmenityText = (property = {}) => {
  const address = property.address && typeof property.address === 'object' ? property.address : {};
  const details = property.details && typeof property.details === 'object' ? property.details : {};
  const buildingDetails = property.buildingDetails && typeof property.buildingDetails === 'object' ? property.buildingDetails : {};
  const rawValues = [property.title, property.description, property.featuresText, property.bathroomText, address.street, address.city, address.state, details.amenities, details.features, buildingDetails.amenities, property.amenities, property.features];
  return rawValues.flatMap((v) => (Array.isArray(v) ? v : [v])).map((v) => String(v || '').trim()).filter(Boolean).join(' ').toLowerCase();
};

const matchesAmenityFilter = (property = {}, amenityFilter = '') => {
  const haystack = getPropertyAmenityText(property);
  if (!haystack) return false;
  if (amenityFilter === 'mirpeset') return /mirpeset|מרפסת|balcony/.test(haystack);
  if (amenityFilter === 'fitness-center') return /fitness center|fitness-centre|gym|חדר כושר|מכון כושר/.test(haystack);
  return true;
};

const getSortableTimestamp = (property = {}) => {
  const candidates = [property.createdAt, property.updatedAt, property?.dates?.listingDate, property?.dates?.publishedAt];
  for (const c of candidates) {
    const parsed = new Date(c); const ms = parsed.getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  return 0;
};

const applyAllFilterOption = (listings = [], allFilter = '') => {
  const norm = normalizeAllFiltersValue(allFilter);
  if (!norm) return listings;
  if (norm === 'mirpeset' || norm === 'fitness-center') return listings.filter((p) => matchesAmenityFilter(p, norm));
  if (norm === 'price-low-high') return [...listings].sort((l, r) => { const lp = Number(l?.price); const rp = Number(r?.price); if (Number.isNaN(lp) && Number.isNaN(rp)) return 0; if (Number.isNaN(lp)) return 1; if (Number.isNaN(rp)) return -1; return lp - rp; });
  if (norm === 'price-high-low') return [...listings].sort((l, r) => { const lp = Number(l?.price); const rp = Number(r?.price); if (Number.isNaN(lp) && Number.isNaN(rp)) return 0; if (Number.isNaN(lp)) return 1; if (Number.isNaN(rp)) return -1; return rp - lp; });
  if (norm === 'newest') return [...listings].sort((l, r) => getSortableTimestamp(r) - getSortableTimestamp(l));
  if (norm === 'verified') return [...listings].sort((l, r) => Number(Boolean(r?.verified || r?.isVerified || r?.status === 'active')) - Number(Boolean(l?.verified || l?.isVerified || l?.status === 'active')));
  return listings;
};

const buildPropertySearchText = (property = {}) => {
  const values = [property.title, property.description, property.featuresText, property.externalSource, property.status, property?.address?.street, property?.address?.streetNumber, property?.address?.city, property?.buildingDetails?.name, property?.contact?.agency, property?.details?.amenities, property?.details?.features, property?.buildingDetails?.amenities, property?.amenities, property?.features];
  return values.flatMap((v) => (Array.isArray(v) ? v : [v])).map((v) => String(v || '').toLowerCase()).join(' ');
};

const buildKeywordSearchHaystack = (property = {}) => {
  const address = property?.address && typeof property.address === 'object' ? property.address : {};
  const values = [buildPropertySearchText(property), ...getAddressFieldVariants(address, 'street'), ...getAddressFieldVariants(address, 'streetNumber'), ...getAddressFieldVariants(address, 'neighborhood'), ...getAddressFieldVariants(address, 'city'), ...getAddressFieldVariants(address, 'state'), address.country];
  return values.flatMap((v) => (Array.isArray(v) ? v : [v])).map((v) => String(v || '').trim().toLowerCase()).filter(Boolean).join(' ');
};

const matchesKeywordSearch = (property = {}, rawQuery = '') => {
  const norm = String(rawQuery || '').trim().toLowerCase();
  if (!norm) return true;
  const terms = norm.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = buildKeywordSearchHaystack(property);
  if (!haystack) return false;
  return terms.every((term) => haystack.includes(term));
};

const includesAnyKeyword = (searchText = '', keywords = []) => keywords.some((kw) => searchText.includes(kw));

const matchesPropertyCategory = (property = {}, selectedCategory = '') => {
  const category = String(selectedCategory || '').trim().toLowerCase();
  if (!category) return true;
  const keywords = PROPERTY_CATEGORY_KEYWORDS[category];
  if (!keywords || keywords.length === 0) return true;
  return includesAnyKeyword(buildPropertySearchText(property), keywords);
};

const matchesSelectedFeatures = (property = {}, selectedFeatures = []) => {
  const norm = Array.isArray(selectedFeatures) ? selectedFeatures : [];
  if (norm.length === 0) return true;
  const searchText = buildPropertySearchText(property);
  return norm.every((feature) => {
    const keywords = FEATURE_KEYWORDS[String(feature || '').trim().toLowerCase()] || [];
    if (keywords.length === 0) return true;
    return includesAnyKeyword(searchText, keywords);
  });
};

const areStringArraysEqual = (left = [], right = []) => {
  if (left === right) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) { if (String(left[i]) !== String(right[i])) return false; }
  return true;
};

const normalizeContextNumber = (value) => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const prioritizeFavorites = (listings = [], favoriteIdSet = new Set()) => {
  const favorites = []; const others = [];
  listings.forEach((property) => {
    const id = getPropertyId(property);
    if (id && favoriteIdSet.has(String(id))) { favorites.push(property); return; }
    others.push(property);
  });
  return [...favorites, ...others];
};

// ── Image carousel for property cards ────────────────────────────────────────
const CardImageCarousel = ({ images = [], alt = '', isYad2Media = false, sourceType = '', fallbackSeed = '' }) => {
  const [index, setIndex] = useState(0);

  const builtImages = useMemo(() => {
    const processed = images
      .map((img) => buildYad2TopCroppedImageUrl(String(img || ''), sourceType))
      .filter(Boolean);
    if (processed.length === 0) {
      processed.push(`https://picsum.photos/seed/homekey-card-${fallbackSeed}/800/600`);
    }
    return processed;
  }, [images, sourceType, fallbackSeed]);

  const total = builtImages.length;
  const src = builtImages[Math.min(index, total - 1)];

  const goPrev = (e) => {
    e.stopPropagation();
    setIndex((i) => (i - 1 + total) % total);
  };

  const goNext = (e) => {
    e.stopPropagation();
    setIndex((i) => (i + 1) % total);
  };

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', overflow: 'hidden', display: 'block' }}>
      <img
        className={`property-card-image ${isYad2Media ? 'yad2-image' : ''}`}
        src={src}
        alt={alt}
        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {total > 1 && (
        <>
          <button
            type="button"
            className="property-card-img-nav property-card-img-nav--prev"
            onClick={goPrev}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            type="button"
            className="property-card-img-nav property-card-img-nav--next"
            onClick={goNext}
            aria-label="Next photo"
          >
            ›
          </button>
          <span className="property-card-img-counter" aria-hidden="true">
            {index + 1} / {total}
          </span>
        </>
      )}
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const PropertyList = () => {
  const { t, locale, language } = useLanguage();
  const homeKeyBrand = t('brand.homeKey');
  const [properties, setProperties] = useState([]);
  const [filter, setFilter] = useState('all');
  const [citySearch, setCitySearch] = useState('');
  const [roomsSearch, setRoomsSearch] = useState('');
  const [bathsSearch, setBathsSearch] = useState('');
  const [allFilters, setAllFilters] = useState('');
  const [propertyCategorySearch, setPropertyCategorySearch] = useState('');
  const [featureSearch, setFeatureSearch] = useState([]);
  const [sourceSearch, setSourceSearch] = useState('live-yad2');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [error, setError] = useState('');
  const [dbIsEmpty, setDbIsEmpty] = useState(false);
  const [liveSyncStatus, setLiveSyncStatus] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetrySecondsLeft, setAutoRetrySecondsLeft] = useState(0);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [circleSelection, setCircleSelection] = useState({ active: false, propertyIds: [], radiusMeters: 0, center: null });
  const [clearCircleSignal] = useState(0);
  const autoRetryTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const listScrollTimeoutRef = useRef(null);
  const autoRetryTriggeredRef = useRef(false);
  const history = useHistory();
  const location = useLocation();
  const [isListScrolling, setIsListScrolling] = useState(false);
  const [mobileDiscoveryView, setMobileDiscoveryView] = useState(getInitialMobileDiscoveryView);
  const [isMobileViewport, setIsMobileViewport] = useState(typeof window !== 'undefined' ? window.innerWidth <= MOBILE_LAYOUT_BREAKPOINT : false);
  const [interestVersion, setInterestVersion] = useState(0);
  const [savedSearchHistoryMode, setSavedSearchHistoryMode] = useState(false);
  const [savedSearchId, setSavedSearchId] = useState('');
  const [savedSearchHistoryMatches, setSavedSearchHistoryMatches] = useState([]);
  const [hoveredListingId, setHoveredListingId] = useState(null);
  const [roommateListingsForMap, setRoommateListingsForMap] = useState([]);

  const clearTimers = () => {
    if (autoRetryTimerRef.current) clearTimeout(autoRetryTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  };

  const handleListScroll = useCallback(() => {
    setIsListScrolling(true);
    if (listScrollTimeoutRef.current) window.clearTimeout(listScrollTimeoutRef.current);
    listScrollTimeoutRef.current = window.setTimeout(() => { setIsListScrolling(false); listScrollTimeoutRef.current = null; }, 420);
  }, []);

  const loadLiveSyncStatus = async () => {
    try {
      const response = await getPublicYad2SyncStatus();
      setLiveSyncStatus(response?.status || null);
    } catch (statusErr) {
      setLiveSyncStatus({ unavailableReason: statusErr.response?.data?.message || statusErr.message || t('diagnostics.unableToLoadLiveSync') });
    }
  };

  const getLiveUnavailableReason = () => {
    if (liveSyncStatus && typeof liveSyncStatus.unavailableReason === 'string' && liveSyncStatus.unavailableReason.trim()) return liveSyncStatus.unavailableReason.trim();
    if (liveSyncStatus && typeof liveSyncStatus.lastError === 'string' && liveSyncStatus.lastError.trim()) return t('diagnostics.lastSyncFailed', { error: liveSyncStatus.lastError.trim() });
    if (liveSyncStatus && liveSyncStatus.lastResult?.skipped) return t('diagnostics.lastSyncSkipped', { reason: liveSyncStatus.lastResult.reason || t('diagnostics.unknownReason') });
    if (liveSyncStatus && liveSyncStatus.lastResult?.fetched === 0) return t('diagnostics.lastSyncZeroResults');
    if (liveSyncStatus && !liveSyncStatus.lastFinishedAt) return t('diagnostics.syncNotCompleted');
    if (error && error !== '__starting_up__') return error;
    return t('diagnostics.retryShortly');
  };

  const getTopSyncErrorReasons = () => {
    if (!liveSyncStatus || !Array.isArray(liveSyncStatus.topErrorReasons)) return [];
    return liveSyncStatus.topErrorReasons.filter((r) => typeof r === 'string' && r.trim()).slice(0, 3);
  };

  const getLiveSyncSummary = () => {
    if (!liveSyncStatus || typeof liveSyncStatus !== 'object') return '';
    const summary = [];
    summary.push(t('diagnostics.feedUrlStatus', { state: liveSyncStatus.feedUrlConfigured ? t('diagnostics.configured') : t('diagnostics.missing') }));
    const lastFinished = formatTimestamp(liveSyncStatus.lastFinishedAt);
    if (lastFinished) summary.push(t('diagnostics.lastSyncSummary', { value: lastFinished }));
    const fetched = liveSyncStatus.lastResult?.fetched;
    if (typeof fetched === 'number') summary.push(t('diagnostics.fetchedSummary', { value: fetched }));
    const pruned = liveSyncStatus.lastResult?.pruned;
    if (typeof pruned === 'number') summary.push(t('diagnostics.prunedSummary', { value: pruned }));
    return summary.join(' • ');
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextCity = String(params.get('q') || '').trim();
    const nextRooms = String(params.get('rooms') || '').trim();
    const nextBaths = String(params.get('baths') || '').trim();
    const nextAllFilters = normalizeAllFiltersValue(params.get('allFilters'));
    const nextPropertyCategoryRaw = String(params.get('propertyCategory') || '').toLowerCase().trim();
    const nextPropertyCategory = PROPERTY_CATEGORY_OPTIONS.includes(nextPropertyCategoryRaw) ? nextPropertyCategoryRaw : '';
    const nextFeatureSearch = String(params.get('features') || '').split(',').map((v) => String(v || '').trim().toLowerCase()).filter((v) => FEATURE_FILTER_OPTIONS.includes(v));
    const nextTypeRaw = String(params.get('type') || '').toLowerCase();
    const nextType = LISTING_TYPE_OPTIONS.includes(nextTypeRaw) ? nextTypeRaw : 'all';
    const nextSource = normalizeSourceFilterValue(params.get('source'));
    const parseOptionalPrice = (raw) => {
      if (raw == null || raw === '') return '';
      const n = Number(raw);
      if (Number.isNaN(n)) return '';
      return String(clampPriceValue(n));
    };
    let nextMinPrice = parseOptionalPrice(params.get('minPrice'));
    let nextMaxPrice = parseOptionalPrice(params.get('maxPrice'));
    if (nextMinPrice !== '' && nextMaxPrice !== '' && Number(nextMinPrice) > Number(nextMaxPrice)) {
      const lo = String(Math.min(Number(nextMinPrice), Number(nextMaxPrice)));
      const hi = String(Math.max(Number(nextMinPrice), Number(nextMaxPrice)));
      nextMinPrice = lo; nextMaxPrice = hi;
    }
    const nextFavoritesOnly = params.get('liked') === '1';
    const nextSavedSearchHistoryMode = params.get(SAVED_SEARCH_HISTORY_QUERY_KEY) === '1';
    const nextSavedSearchId = String(params.get(SAVED_SEARCH_ID_QUERY_KEY) || '').trim();
    setCitySearch(nextCity); setRoomsSearch(nextRooms); setBathsSearch(nextBaths);
    setAllFilters(nextAllFilters); setPropertyCategorySearch(nextPropertyCategory);
    setFeatureSearch(nextFeatureSearch); setFilter(nextType); setSourceSearch(nextSource);
    setMinPrice(nextMinPrice); setMaxPrice(nextMaxPrice); setFavoritesOnly(nextFavoritesOnly);
    setSavedSearchHistoryMode(nextSavedSearchHistoryMode && Boolean(nextSavedSearchId));
    setSavedSearchId(nextSavedSearchId);
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!savedSearchHistoryMode || !savedSearchId) { setSavedSearchHistoryMatches([]); return; }
      try {
        const inboxState = await getMyInstantAlertInbox({ searchId: savedSearchId });
        if (cancelled) return;
        const matches = Array.isArray(inboxState?.data) ? inboxState.data.map((item, i) => toHistoricalMatchProperty(item, i)) : [];
        setSavedSearchHistoryMatches(matches);
      } catch (_err) { if (!cancelled) setSavedSearchHistoryMatches([]); }
    };
    load();
    return () => { cancelled = true; };
  }, [savedSearchHistoryMode, savedSearchId]);

  useEffect(() => {
    clearTimers();
    const fetchProperties = async () => {
      const isAutoRetry = autoRetryTriggeredRef.current;
      autoRetryTriggeredRef.current = false;
      if (!isAutoRetry) { setLoading(true); setError(''); setLiveSyncStatus(null); setAutoRetrySecondsLeft(0); }
      setSlowLoad(false);
      const slowTimer = setTimeout(() => setSlowLoad(true), 8000);
      try {
        const params = {};
        if (sourceSearch !== 'all') params.source = sourceSearch;
        if (filter !== 'all' && filter !== 'roommates') params.type = filter;
        if (citySearch.trim()) params.q = citySearch.trim();
        if (roomsSearch.trim()) params.rooms = roomsSearch.trim();
        if (bathsSearch.trim()) params.baths = bathsSearch.trim();
        if (minPrice !== '') params.minPrice = minPrice;
        if (maxPrice !== '') params.maxPrice = maxPrice;
        const hasUserFilters = Object.keys(params).length > 1;
        const result = await getProperties(params);
        const data = result.data || [];
        setError(''); setProperties(data);
        if (data.length > 0) { setDbIsEmpty(false); setLiveSyncStatus(null); writeCachedLiveListings(data); }
        else if (!hasUserFilters) { setDbIsEmpty(true); await loadLiveSyncStatus(); }
      } catch (err) {
        const status = err.response && err.response.status;
        const isTransient = status === 503 || status === 502 || !err.response;
        const isTimeout = err.code === 'ECONNABORTED';
        const canFallback = isTransient || isTimeout || (status >= 500 && status < 600);
        let usedCache = false;
        if (canFallback) {
          const cached = readCachedLiveListings();
          if (cached.length > 0) { setProperties(cached); setDbIsEmpty(false); usedCache = true; }
          else { setDbIsEmpty(true); setProperties([]); await loadLiveSyncStatus(); }
        }
        if (isTransient && retryCount < MAX_AUTO_RETRIES) {
          const secs = RETRY_INTERVAL_MS / 1000;
          setAutoRetrySecondsLeft(secs);
          countdownTimerRef.current = setInterval(() => setAutoRetrySecondsLeft((s) => (s > 1 ? s - 1 : 0)), 1000);
          autoRetryTimerRef.current = setTimeout(() => { clearInterval(countdownTimerRef.current); autoRetryTriggeredRef.current = true; setRetryCount((c) => c + 1); }, RETRY_INTERVAL_MS);
          if (!usedCache) setError('__starting_up__');
        } else if (canFallback) { if (!usedCache) setError(t('diagnostics.demoFallback')); else setError(''); }
        else if (isTimeout) setError(t('diagnostics.serverTimeout'));
        else setError(t('diagnostics.failedToLoadProperties', { status: status || 'unknown' }));
      } finally { clearTimeout(slowTimer); setSlowLoad(false); setLoading(false); }
    };
    fetchProperties();
    return clearTimers;
  }, [sourceSearch, filter, citySearch, roomsSearch, bathsSearch, minPrice, maxPrice, retryCount, t]);

  useEffect(() => () => { if (listScrollTimeoutRef.current) { window.clearTimeout(listScrollTimeoutRef.current); listScrollTimeoutRef.current = null; } }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handle = () => setInterestVersion((v) => v + 1);
    window.addEventListener('homekey:interest-updated', handle);
    return () => window.removeEventListener('homekey:interest-updated', handle);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handle = () => setIsMobileViewport(window.innerWidth <= MOBILE_LAYOUT_BREAKPOINT);
    handle(); window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const interestSummary = useMemo(() => getInterestSummary(), [interestVersion]);
  const favoritesCount = interestSummary.favoriteIds.length;
  const savedCount = interestSummary.savedIds.length;
  const favoriteIdsKey = (interestSummary.favoriteIds || []).map((id) => String(id)).join('|');
  const favoriteIdSet = useMemo(() => new Set((interestSummary.favoriteIds || []).map((id) => String(id))), [favoriteIdsKey]);

  const mapSourceProperties = useMemo(() => {
    let displayProperties;
    if (dbIsEmpty) {
      let samples = [...SAMPLE_PROPERTIES];
      if (filter !== 'all') samples = samples.filter((p) => matchesListingType(p, filter));
      if (citySearch.trim()) samples = samples.filter((p) => matchesKeywordSearch(p, citySearch));
      if (roomsSearch.trim()) samples = samples.filter((p) => matchesRoomsSelection(getBedroomCount(p), roomsSearch));
      if (bathsSearch.trim()) samples = samples.filter((p) => matchesBathroomsSelection(getBathroomCount(p), bathsSearch));
      if (propertyCategorySearch) samples = samples.filter((p) => matchesPropertyCategory(p, propertyCategorySearch));
      if (featureSearch.length > 0) samples = samples.filter((p) => matchesSelectedFeatures(p, featureSearch));
      if (minPrice !== '') samples = samples.filter((p) => p.price >= Number(minPrice));
      if (maxPrice !== '') samples = samples.filter((p) => p.price <= Number(maxPrice));
      displayProperties = samples;
    } else {
      displayProperties = [...properties];
      if (filter !== 'all') displayProperties = displayProperties.filter((p) => matchesListingType(p, filter));
      if (citySearch.trim()) displayProperties = displayProperties.filter((p) => matchesKeywordSearch(p, citySearch));
      if (roomsSearch.trim()) displayProperties = displayProperties.filter((p) => matchesRoomsSelection(getBedroomCount(p), roomsSearch));
      if (bathsSearch.trim()) displayProperties = displayProperties.filter((p) => matchesBathroomsSelection(getBathroomCount(p), bathsSearch));
      if (propertyCategorySearch) displayProperties = displayProperties.filter((p) => matchesPropertyCategory(p, propertyCategorySearch));
      if (featureSearch.length > 0) displayProperties = displayProperties.filter((p) => matchesSelectedFeatures(p, featureSearch));
      if (minPrice !== '') displayProperties = displayProperties.filter((p) => Number(p?.price) >= Number(minPrice));
      if (maxPrice !== '') displayProperties = displayProperties.filter((p) => Number(p?.price) <= Number(maxPrice));
    }
    if (favoritesOnly) displayProperties = displayProperties.filter((p) => { const id = getPropertyId(p); return id ? favoriteIdSet.has(String(id)) : false; });
    displayProperties = applyAllFilterOption(displayProperties, allFilters);
    return displayProperties.filter((p) => p && typeof p === 'object');
  }, [allFilters, dbIsEmpty, filter, citySearch, roomsSearch, bathsSearch, propertyCategorySearch, featureSearch, minPrice, maxPrice, properties, favoritesOnly, favoriteIdSet]);

  const circlePropertyIdSet = useMemo(() => new Set((circleSelection.propertyIds || []).map((id) => String(id))), [circleSelection.propertyIds]);

  const circleCityHints = useMemo(() => {
    if (!circleSelection.active) return [];
    const cityMap = new Map();
    mapSourceProperties.forEach((property) => {
      const id = getPropertyId(property);
      if (!id || !circlePropertyIdSet.has(String(id))) return;
      const localizedAddress = getLocalizedAddress(property?.address, language);
      const city = safeText(localizedAddress.city);
      if (!city) return;
      const key = city.toLowerCase();
      if (!cityMap.has(key)) cityMap.set(key, city);
    });
    return Array.from(cityMap.values()).slice(0, 8);
  }, [circlePropertyIdSet, circleSelection.active, mapSourceProperties, language]);

  useEffect(() => {
    const searchContext = {
      source: 'property-list',
      search: { q: citySearch.trim(), type: filter !== 'all' ? filter : '', rooms: roomsSearch.trim(), baths: bathsSearch.trim(), minPrice: normalizeContextNumber(minPrice), maxPrice: normalizeContextNumber(maxPrice), propertyCategory: propertyCategorySearch.trim(), featureFilters: featureSearch, likedOnly: favoritesOnly },
      circle: { active: Boolean(circleSelection.active), radiusMeters: Number(circleSelection.radiusMeters) || 0, center: circleSelection.center || null, cityHints: circleCityHints },
      locationSearch: location.search || '', capturedAt: new Date().toISOString(),
    };
    writeSavedSearchContext(searchContext);
  }, [citySearch, filter, roomsSearch, bathsSearch, minPrice, maxPrice, propertyCategorySearch, featureSearch, favoritesOnly, circleSelection.active, circleSelection.radiusMeters, circleSelection.center, circleCityHints, location.search]);

  const activeDisplayProperties = useMemo(() => {
    const visible = !circleSelection.active ? mapSourceProperties : mapSourceProperties.filter((p) => { const id = getPropertyId(p); return id ? circlePropertyIdSet.has(String(id)) : false; });
    return prioritizeFavorites(visible, favoriteIdSet);
  }, [circleSelection.active, circlePropertyIdSet, favoriteIdSet, mapSourceProperties]);

  const displayProperties = useMemo(() => {
    const merged = (() => {
      if (!savedSearchHistoryMode || savedSearchHistoryMatches.length === 0) return activeDisplayProperties;
      const visibleSet = new Set(activeDisplayProperties.map((p) => String(getPropertyId(p) || '').trim()).filter(Boolean));
      const uniqueHistory = savedSearchHistoryMatches.filter((hp) => { const sid = String(hp?.sourcePropertyId || '').trim(); if (!sid) return true; return !visibleSet.has(sid); });
      return [...activeDisplayProperties, ...uniqueHistory];
    })();
    return prioritizeFavorites(merged, favoriteIdSet);
  }, [activeDisplayProperties, favoriteIdSet, savedSearchHistoryMatches, savedSearchHistoryMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleSave = async () => {
      const cityLabel = citySearch.trim() || circleCityHints[0] || '';
      const typeLabel = filter === 'sale' ? t('propertyList.sale') : filter === 'rental' ? t('propertyList.rental') : (filter === 'roommates' ? t('propertyList.roommates') : t('propertyList.searchNameType'));
      const generatedName = `${cityLabel || t('propertyList.my')} ${typeLabel} ${new Date().toLocaleDateString(locale)}`;
      const payload = {
        name: generatedName, enabled: true,
        criteria: { type: filter !== 'all' ? filter : '', city: citySearch.trim(), minPrice: minPrice !== '' ? Number(minPrice) : '', maxPrice: maxPrice !== '' ? Number(maxPrice) : '', rooms: roomsSearch.trim(), baths: bathsSearch.trim(), searchText: citySearch.trim(), cityHints: circleCityHints, circle: circleSelection.active && circleSelection.center && Number(circleSelection.radiusMeters) > 0 ? { center: circleSelection.center, radiusMeters: Number(circleSelection.radiusMeters) } : undefined },
        sourceContext: { searchText: citySearch.trim(), propertyCategory: propertyCategorySearch.trim(), featureFilters: featureSearch, likedOnly: favoritesOnly, circle: circleSelection.active && circleSelection.center && Number(circleSelection.radiusMeters) > 0 ? { center: circleSelection.center, radiusMeters: Number(circleSelection.radiusMeters), cityHints: circleCityHints } : undefined },
      };
      try { await saveMyCurrentSearchAlert(payload); window.dispatchEvent(new CustomEvent('homekey:save-current-search-result', { detail: { success: true } })); }
      catch (err) { window.dispatchEvent(new CustomEvent('homekey:save-current-search-result', { detail: { success: false, message: err.response?.data?.message || t('diagnostics.saveSearchFailed') } })); }
    };
    window.addEventListener('homekey:save-current-search', handleSave);
    return () => window.removeEventListener('homekey:save-current-search', handleSave);
  }, [citySearch, circleCityHints, circleSelection.active, circleSelection.center, circleSelection.radiusMeters, favoritesOnly, featureSearch, filter, maxPrice, minPrice, propertyCategorySearch, roomsSearch, bathsSearch, locale, t]);

  const mobileListingHeaderTitle = isRoommatesView
    ? (t('propertyList.roommates') || 'Roommates')
    : (loading
        ? t('propertyList.loadingHomes')
        : t('propertyList.homesCount', { count: displayProperties.length.toLocaleString(locale) }));

  const mobileHeaderEyebrow = isRoommatesView
    ? 'Find & list shared rooms'
    : t('propertyList.mobileHeaderEyebrow', { brand: homeKeyBrand });

  const mobileFilterBtnLabel = isRoommatesView
    ? 'Find / Post Room'
    : t('propertyList.filters');
  const isMapPanelVisible = !isMobileViewport || mobileDiscoveryView === 'map';
  const isRoommatesView = filter === 'roommates';

  useEffect(() => {
    if (isRoommatesView && isMobileViewport) {
      setMobileDiscoveryView('list');
    }
  }, [isRoommatesView, isMobileViewport]);
  const openMobileFilters = () => {

  const handleCircleSelectionChange = useCallback((selection) => {
    const next = (!selection || typeof selection !== 'object')
      ? { active: false, propertyIds: [], radiusMeters: 0, center: null }
      : { active: Boolean(selection.active), propertyIds: Array.isArray(selection.propertyIds) ? selection.propertyIds : [], radiusMeters: Number(selection.radiusMeters) || 0, center: selection.center || null };
    setCircleSelection((prev) => {
      const prevC = prev && prev.center ? prev.center : null; const nextC = next.center;
      const sameC = (!prevC && !nextC) || (prevC && nextC && prevC.lat === nextC.lat && prevC.lng === nextC.lng);
      if (prev.active === next.active && prev.radiusMeters === next.radiusMeters && sameC && areStringArraysEqual(prev.propertyIds, next.propertyIds)) return prev;
      return next;
    });
  }, []);

  const renderResults = () => {
    if (loading) return <p className="status-message">{slowLoad ? t('propertyList.serverTakingMoment') : t('propertyList.loadingProperties')}</p>;
    if (error && !dbIsEmpty) return (
      <div className="status-panel">
        <p className="status-message status-message-error">{error}</p>
        <button className="secondary-btn" onClick={() => { clearTimers(); setRetryCount((c) => c + 1); }}>{t('propertyList.tryAgain')}</button>
      </div>
    );
    return (
      <div className='container'>
        {savedSearchHistoryMode && (
          <div className="saved-search-history-cap">
            <p>{t('propertyList.savedSearchHistorySummary', { activeCount: activeDisplayProperties.length.toLocaleString(locale) })}</p>
          </div>
        )}
        {dbIsEmpty && (
          <div className="status-banner">
            <p>{error === '__starting_up__' ? `⏳ ${t('propertyList.connectingToDatabase', { seconds: autoRetrySecondsLeft })}` : `⚡ ${t('propertyList.liveFeedUnavailable')}`}</p>
            {error !== '__starting_up__' && <p>{getLiveUnavailableReason()}</p>}
            {error !== '__starting_up__' && getLiveSyncSummary() && <p>{getLiveSyncSummary()}</p>}
            {error !== '__starting_up__' && getTopSyncErrorReasons().length > 0 && (
              <div>
                <p><strong>{t('propertyList.topSyncErrorReasons')}</strong></p>
                <ol>{getTopSyncErrorReasons().map((r, i) => <li key={`sync-reason-${i}`}>{r}</li>)}</ol>
              </div>
            )}
            <button className="secondary-btn" onClick={() => { clearTimers(); setRetryCount((c) => c + 1); }}>{t('propertyList.retryConnection')}</button>
          </div>
        )}
        {!dbIsEmpty && displayProperties.length === 0 && <p className="status-message">{t('propertyList.noPropertiesFound')}</p>}
        {displayProperties.map((property, index) => {
          if (!property || typeof property !== 'object') return null;
          const isHistoricalMatch = property.isHistoricalMatch === true;
          const propertyId = getPropertyId(property);
          const hoverTargetId = propertyId ? String(propertyId) : null;
          const interestPropertyId = String(isHistoricalMatch ? (property.sourcePropertyId || '') : propertyId).trim();
          const canOpenDetail = Boolean(propertyId) && !isHistoricalMatch;
          const isYad2Media = isYad2LikeListing(property);
          const isFavorite = interestPropertyId ? favoriteIdSet.has(interestPropertyId) : false;
          const key = propertyId || `property-${index}`;
          const allCardImages = Array.isArray(property.images) ? property.images : [];
          const { street, locationLine } = getAddressDisplay(property.address, language);
          const titleFromData = sanitizeReadableText(property, property.title);
          const fallbackStreetFromTitle = (() => {
            const rawTitle = safeText(property?.title);
            const parts = splitStreetAndNumber(rawTitle, '');
            if (!parts.street && !parts.streetNumber) return '';
            return language === 'en' ? [safeText(parts.streetNumber), safeText(parts.street)].filter(Boolean).join(' ') : [safeText(parts.street), safeText(parts.streetNumber)].filter(Boolean).join(' ');
          })();
          const displayStreet = dedupeRepeatingPhrase(safeText(street || fallbackStreetFromTitle));
          const bedroomCount = getBedroomCount(property);
          const bathroomCount = getBathroomCount(property);
          const displayLocation = safeText(locationLine);
          const displayTitle = displayStreet || titleFromData || displayLocation || t('propertyList.propertyListingFallback');
          const shouldShowLocation = Boolean(displayLocation && displayLocation.toLowerCase() !== displayTitle.toLowerCase());
          const monthly = property.financialDetails?.totalMonthlyPayment;
          const { whatsappNumber: cardWhatsAppNumber } = getPropertyAgentWhatsApp(property);
          const cardAgentDisplayName = getPropertyAgentDisplayName(property);
          const agentHasWhatsApp = Boolean(normalizePhoneForLinks(cardWhatsAppNumber));
          const cardWhatsAppHref = agentHasWhatsApp ? buildWhatsAppHref(cardWhatsAppNumber, cardAgentDisplayName, property.type || '', displayStreet) : '';
          const virtualTourHref = normalizeVirtualTourUrl(property.virtualTourUrl);
          const hasVirtualTour = Boolean(virtualTourHref);
          const historicalMatchDate = formatHistoryBadgeDate(property.historyMatchedAt);
          const openPropertyDetail = () => { if (!canOpenDetail) return; history.push(`/properties/${propertyId}`, { previewProperty: property }); };
          return (
            <div key={key} className={`property-card ${canOpenDetail ? 'is-clickable' : ''}`}
              onMouseEnter={() => { if (!hoverTargetId) return; setHoveredListingId((cur) => cur === hoverTargetId ? cur : hoverTargetId); }}
              onMouseLeave={() => setHoveredListingId((cur) => cur == null ? cur : null)}
              onClick={openPropertyDetail} style={{ cursor: canOpenDetail ? 'pointer' : 'default' }}>
              <div className="property-card-body">
                <div className="property-card-text-stack">
                  <p className={`property-card-price ${language === 'he' ? 'property-card-price--hebrew' : ''}`} dir="ltr">{formatCardPrice(property, locale, t('propertyList.priceUnavailable'))}</p>
                  <h3 className={`property-card-title ${displayStreet ? 'property-card-title--street' : ''}`}>{displayTitle}</h3>
                  {shouldShowLocation && <p className="property-card-location">{displayLocation}</p>}
                  {isHistoricalMatch && <p className="property-card-history-note">{t('propertyList.previouslyAvailable')}{historicalMatchDate ? ` • ${t('propertyList.matched')} ${historicalMatchDate}` : ''}</p>}
                </div>

                {/* ── Image with < > carousel arrows ── */}
                <div className="property-card-image-wrap property-card-image-wrap--framed">
                  <CardImageCarousel
                    images={allCardImages}
                    alt={displayTitle || t('propertyList.propertyListingFallback')}
                    isYad2Media={isYad2Media}
                    sourceType={property.externalSource || property.sourceType || ''}
                    fallbackSeed={key}
                  />
                  <button type="button" className={`property-card-favorite-btn property-card-favorite-btn--card-overlay ${isFavorite ? 'is-active' : ''}`}
                    aria-label={isFavorite ? t('propertyList.removeFavoriteFromListing') : t('propertyList.addFavoriteToListing')}
                    aria-pressed={isFavorite} disabled={!interestPropertyId}
                    onClick={(e) => { e.stopPropagation(); if (!interestPropertyId) return; toggleFavoriteProperty(interestPropertyId); incrementHeartClickCount(); setInterestVersion((v) => v + 1); }}>
                    <span className="property-heart-icon-wrap" aria-hidden="true">
                      <svg className="property-heart-icon" viewBox="0 0 24 24" focusable="false"><path d="M12 21s-6.6-4.5-9.1-8.2C.8 9.5 1.5 5.8 4.5 4c2.2-1.3 5-.7 6.7 1.2L12 6l.8-.8c1.8-1.9 4.5-2.4 6.7-1.2 3 1.8 3.7 5.5 1.6 8.8C18.6 16.5 12 21 12 21Z" /></svg>
                    </span>
                  </button>
                  {isYad2Media && <span className="yad2-logo-mask yad2-logo-mask--card" aria-hidden="true" />}
                </div>

                <div className="property-card-stats" aria-label={t('propertyList.propertyHighlights')}>
                  <span className="property-card-stat"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.5 12v5"/><path d="M20.5 12v5"/><path d="M3.5 14.5h17"/><path d="M5.5 12V9.8A1.8 1.8 0 0 1 7.3 8h4.9A1.8 1.8 0 0 1 14 9.8V12"/><path d="M14 12V9.8A1.8 1.8 0 0 1 15.8 8h.9a1.8 1.8 0 0 1 1.8 1.8V12"/></svg><span>{bedroomCount ?? '—'} {t('propertyList.beds')}</span></span>
                  <span className="property-card-stat"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14v4a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z"/><path d="M8 12V9.5A2.5 2.5 0 0 1 10.5 7h2A1.5 1.5 0 0 1 14 8.5v0A1.5 1.5 0 0 1 12.5 10H11"/><path d="M7.5 19v1.5M16.5 19v1.5"/></svg><span>{bathroomCount ?? '—'} {t('propertyList.baths')}</span></span>
                  <span className="property-card-stat"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5h5v2H7v3H5z"/><path d="M14 5h5v5h-2V7h-3z"/><path d="M5 14h2v3h3v2H5z"/><path d="M17 17v-3h2v5h-5v-2z"/></svg><span>{property.size ?? '—'} {t('propertyList.sqm')}</span></span>
                </div>
                <div className="property-card-actions">
                  {!isMobileViewport && hasVirtualTour && (
                    <button type="button" className="property-card-action-btn property-card-action-btn--outline" onClick={(e) => { e.stopPropagation(); if (typeof window === 'undefined') return; window.open(virtualTourHref, '_blank', 'noopener,noreferrer'); }}>{t('propertyList.tour3d')}</button>
                  )}
                  <button type="button" className={`property-card-action-btn ${isMobileViewport ? 'property-card-action-btn--primary-mobile' : 'property-card-action-btn--outline'}`} onClick={(e) => { e.stopPropagation(); openPropertyDetail(); }} disabled={!canOpenDetail}>{t('propertyList.viewDetails')}</button>
                  {!isMobileViewport && (
                    <button type="button" className={`property-card-action-btn ${agentHasWhatsApp ? 'property-card-action-btn--whatsapp' : 'property-card-action-btn--whatsapp-disabled'}`}
                      onClick={(e) => { e.stopPropagation(); if (!agentHasWhatsApp || !cardWhatsAppHref || typeof window === 'undefined') return; window.open(cardWhatsAppHref, '_blank', 'noopener,noreferrer'); }} disabled={!agentHasWhatsApp}>{t('propertyList.whatsapp')}</button>
                  )}
                  {isMobileViewport && (hasVirtualTour || agentHasWhatsApp) && (
                    <div className="property-card-mobile-quick-actions" aria-label={t('propertyList.quickPropertyActions')}>
                      {hasVirtualTour && <button type="button" className="property-card-mobile-link" onClick={(e) => { e.stopPropagation(); if (typeof window === 'undefined') return; window.open(virtualTourHref, '_blank', 'noopener,noreferrer'); }}>{t('propertyList.tour3d')}</button>}
                      {agentHasWhatsApp && <button type="button" className="property-card-mobile-link" onClick={(e) => { e.stopPropagation(); if (!cardWhatsAppHref || typeof window === 'undefined') return; window.open(cardWhatsAppHref, '_blank', 'noopener,noreferrer'); }}>{t('propertyList.whatsapp')}</button>}
                    </div>
                  )}
                </div>
                {monthly != null && <p className="property-card-extra">{t('propertyList.estimatedMonthly', { value: formatCurrency(monthly, locale) })}</p>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="property-list-page">
      <section className={`desktop-discovery-layout ${mobileDiscoveryView === 'list' ? 'mobile-list-active' : 'mobile-map-active'}`} aria-label={t('propertyList.listingMapLayoutAriaLabel')}>
        <div className={`desktop-discovery-list-column minimalist-scrollbar ${isListScrolling ? 'is-scrolling' : ''}`} onScroll={handleListScroll}>
          <section className="mobile-listing-header" aria-label={t('propertyList.listingQuickControlsAriaLabel')}>
            <div className="mobile-listing-header-copy">
              <p className="mobile-listing-header-eyebrow">{mobileHeaderEyebrow}</p>
              <h2>{mobileListingHeaderTitle}</h2>
            </div>
            <button
              type="button"
              className="mobile-listing-header-filter-btn"
              onClick={openMobileFilters}
              style={isRoommatesView ? { background: '#2d6b5e', borderColor: '#2d6b5e' } : {}}
            >
              {mobileFilterBtnLabel}
            </button>
          </section>

          {!isRoommatesView && (
            <>
              <div className="homepage-hero-shell">
                <section className="hero-banner">
                  <img className="hero-banner-background-image" src={HERO_BACKGROUND_IMAGE} alt="" aria-hidden="true" />
                  <div className="hero-banner-overlay" aria-hidden="true" />
                  <div className="hero-banner-grid">
                    <div className="hero-banner-copy">
                      <div className="hero-banner-copy-text"><h1>{t('propertyList.heroTitle')}</h1></div>
                      <div className="hero-banner-logo" aria-hidden="true" />
                    </div>
                  </div>
                </section>
              </div>
              <div className="property-interest-toolbar">
                <button type="button" className={`secondary-btn ${favoritesOnly ? 'active-interest-filter' : ''}`}
                  onClick={() => {
                    const params = new URLSearchParams(location.search);
                    const next = !favoritesOnly;
                    if (next) params.set('liked', '1'); else params.delete('liked');
                    const ns = params.toString();
                    history.replace({ pathname: '/', search: ns ? `?${ns}` : '' });
                  }}>
                  {favoritesOnly ? t('propertyList.showAllListings') : t('propertyList.showFavoritesOnly')}
                </button>
              </div>
              <div className="property-interest-summary" aria-live="polite">
                <div className="property-interest-summary-counts">
                  <span>{t('propertyList.favorites')}: {favoritesCount}</span>
                  <span>{t('propertyList.savedFile')}: {savedCount}</span>
                </div>
              </div>
            </>
          )}

          <div className="desktop-discovery-list-scroll">
            {isRoommatesView ? (
              <RoommatesView
                favoriteIdSet={favoriteIdSet}
                isMobileViewport={isMobileViewport}
                language={language}
                locale={locale}
                onFavoriteToggle={() => setInterestVersion((v) => v + 1)}
                onListingsChange={setRoommateListingsForMap}
                t={t}
              />
            ) : (
              renderResults()
            )}
          </div>
        </div>

        <div className="desktop-discovery-map-column">
          <section className="google-listings-map-card" aria-label={t('propertyList.apartmentLocationMap')}>
            <GoogleListingsMap
              key={`google-listings-map-${language}`}
              properties={isRoommatesView ? roommateListingsForMap : (loading ? [] : mapSourceProperties)}
              isRoommatesMode={isRoommatesView}
              searchResultCount={loading ? 0 : displayProperties.length}
              favoritePropertyIds={interestSummary.favoriteIds}
              onCircleSelectionChange={handleCircleSelectionChange}
              clearSignal={clearCircleSignal}
              drawModeToggleSignal={0}
              isVisible={isMapPanelVisible}
              hoveredListingId={hoveredListingId}
            />
          </section>
        </div>
      </section>
      <div className="mobile-thumb-zone-controls" aria-label={t('propertyList.thumbZoneMapControls')}>
        <div className="mobile-discovery-toggle" role="group" aria-label={t('propertyList.switchBetweenMapAndList')}>
          <button type="button" className={`mobile-discovery-toggle-btn ${mobileDiscoveryView === 'map' ? 'is-active' : ''}`} onClick={() => setMobileDiscoveryView('map')} aria-pressed={mobileDiscoveryView === 'map'}>{t('common.map')}</button>
          <button type="button" className={`mobile-discovery-toggle-btn ${mobileDiscoveryView === 'list' ? 'is-active' : ''}`} onClick={() => setMobileDiscoveryView('list')} aria-pressed={mobileDiscoveryView === 'list'}>{t('common.list')}</button>
        </div>
      </div>
    </div>
  );
};

export default PropertyList;
