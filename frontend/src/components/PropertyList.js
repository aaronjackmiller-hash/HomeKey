import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { getProperties, getPublicYad2SyncStatus } from '../services/api';
import HomeKeyLogoBadge from './HomeKeyLogoBadge';
import GoogleListingsMap from './GoogleListingsMap';
import SAMPLE_PROPERTIES from '../data/sampleProperties';
import heroBannerLogo from '../assets/h-letter-logo-transparent-fixed.png';
import heroBalconyImage from '../assets/Newest Homepage Photo.jpg';
import {
  getInterestSummary,
} from '../utils/propertyInterest';

const MAX_AUTO_RETRIES = 4; // 4 × 5s = 20s of auto-retry
const RETRY_INTERVAL_MS = 5000;
const LIVE_LISTINGS_CACHE_KEY = 'homekey:live-listings-cache:v1';
const PRICE_SLIDER_MIN = 0;
const PRICE_SLIDER_MAX = 20000;
const HERO_BACKGROUND_IMAGE = heroBalconyImage;

const formatCurrency = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `₪${Number(value).toLocaleString()}`;
};

const formatCardPrice = (property = {}) => {
  const asNumber = Number(property.price);
  if (Number.isNaN(asNumber)) return 'Price unavailable';
  const base = `${asNumber.toLocaleString()} ₪`;
  return String(property.type || '').toLowerCase() === 'rental' ? `${base}/mo` : base;
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

const buildWhatsAppHref = (phone, title = 'this listing') => {
  const normalizedPhone = normalizePhoneForLinks(phone);
  if (!normalizedPhone) return '';
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(`Hi, I am interested in ${title}.`)}`;
};

const formatTimestamp = (isoValue) => {
  if (!isoValue) return null;
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString();
};

const readCachedLiveListings = () => {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(LIVE_LISTINGS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === 'object');
  } catch (_err) {
    return [];
  }
};

const writeCachedLiveListings = (listings) => {
  if (typeof window === 'undefined' || !window.localStorage || !Array.isArray(listings)) return;
  try {
    window.localStorage.setItem(LIVE_LISTINGS_CACHE_KEY, JSON.stringify(listings.slice(0, 250)));
  } catch (_err) {
    // Ignore quota/storage errors; cache is best-effort only.
  }
};

const safeText = (value) => (typeof value === 'string' ? value.trim() : '');
const ENGLISH_LISTING_WORD_RE = /\b(the|and|with|for|in|to|from|apartment|property|rent|rental|sale|bed|bath|room|building|near|available|price|spacious|located)\b/i;
const hasHebrew = (value) => /[א-ת]/.test(String(value || ''));
const isYad2LikeListing = (property = {}) =>
  /yad2/i.test(String(property.externalSource || ''))
  || ['yad2-sync', 'yad2-scrape'].includes(String(property.sourceType || ''));
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
    seen.add(key);
    return true;
  });
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const splitStreetAndNumber = (streetValue = '', explicitStreetNumber = '') => {
  let street = safeText(streetValue);
  let streetNumber = safeText(explicitStreetNumber);

  if (!streetNumber) {
    const leadingNumber = street.match(/^(\d+[a-zA-Zא-ת0-9\-\/]*)\s+(.+)$/);
    if (leadingNumber) {
      streetNumber = safeText(leadingNumber[1]);
      street = safeText(leadingNumber[2]);
    }
  }

  if (!streetNumber) {
    const trailingNumber = street.match(/^(.+?)\s+(\d+[a-zA-Zא-ת0-9\-\/]*)$/);
    if (trailingNumber) {
      street = safeText(trailingNumber[1]);
      streetNumber = safeText(trailingNumber[2]);
    }
  }

  if (street && streetNumber) {
    const escapedNumber = escapeRegex(streetNumber);
    street = street
      .replace(new RegExp(`^${escapedNumber}\\s+`, 'i'), '')
      .replace(new RegExp(`\\s+${escapedNumber}$`, 'i'), '')
      .trim();
  }

  return { street, streetNumber };
};

const normalizeStreetDisplay = (streetValue = '', explicitStreetNumber = '') => {
  const { street, streetNumber } = splitStreetAndNumber(streetValue, explicitStreetNumber);
  return [street, streetNumber].filter(Boolean).join(' ').trim();
};

const getAddressDisplay = (address = {}) => {
  const street = normalizeStreetDisplay(address.street, address.streetNumber);
  const city = safeText(address.city);
  const state = safeText(address.state);
  const zip = safeText(address.zip);
  const nonIsraelCountry = safeText(address.country).toLowerCase() === 'israel' ? '' : safeText(address.country);
  const locationParts = dedupeCaseInsensitive([city, state, zip, nonIsraelCountry]);
  const fullAddress = [street, ...locationParts].filter(Boolean).join(', ');
  return { street, fullAddress, locationLine: locationParts.join(', ') };
};

const getPropertyWhatsAppHref = (property = {}, title = 'this listing') => {
  const externalContact = property.externalContact && typeof property.externalContact === 'object'
    ? property.externalContact
    : {};
  const directContact = property.contact && typeof property.contact === 'object'
    ? property.contact
    : {};
  const agentContact = property.agent && typeof property.agent === 'object' && !Array.isArray(property.agent)
    ? property.agent
    : {};
  const rawPhone = safeText(
    externalContact.whatsapp
      || directContact.whatsapp
      || agentContact.whatsapp
      || externalContact.phone
      || directContact.phone
      || agentContact.phone
  );
  return buildWhatsAppHref(rawPhone, title);
};

const removeYad2ImageLogo = (url, sourceType = '') => {
  const source = String(url || '').trim();
  if (!source) return source;
  const fromYad2 = /yad2/i.test(source) || /yad2/i.test(String(sourceType || ''));
  if (!fromYad2) return source;
  const separator = source.includes('?') ? '&' : '?';
  return `${source}${separator}fit=crop&crop=top&h=780`;
};

const dedupeRepeatingPhrase = (value) => {
  const text = safeText(value);
  if (!text) return '';
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return text;
  const maxPhraseLen = Math.min(6, Math.floor(words.length / 2));
  for (let phraseLen = maxPhraseLen; phraseLen >= 1; phraseLen -= 1) {
    const phrase = words.slice(0, phraseLen).join(' ');
    const repeated = words
      .join(' ')
      .replace(new RegExp(`^(?:${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+){2,}`, 'i'), `${phrase} `)
      .trim();
    if (repeated.length < text.length) return repeated;
  }
  return text;
};

const clampPriceValue = (value) => {
  const asNumber = Number(value);
  if (Number.isNaN(asNumber)) return PRICE_SLIDER_MIN;
  return Math.min(PRICE_SLIDER_MAX, Math.max(PRICE_SLIDER_MIN, asNumber));
};

const matchesRoomsSelection = (bedroomsValue, roomsSelection) => {
  const selected = safeText(roomsSelection);
  if (!selected) return true;
  const bedrooms = Number(bedroomsValue);
  if (Number.isNaN(bedrooms)) return false;
  const EPSILON = 0.001;
  const almostEqual = (left, right) => Math.abs(left - right) < EPSILON;
  if (selected.endsWith('+')) {
    const minRooms = Number(selected.replace('+', ''));
    if (Number.isNaN(minRooms)) return true;
    // Imported data can store either "rooms" or "bedrooms" in the bedrooms field.
    // Treat X+ rooms as matching both >= X bedrooms and >= (X - 1) bedrooms.
    return bedrooms >= Math.max(0, minRooms - 1);
  }
  const selectedRooms = Number(selected);
  if (Number.isNaN(selectedRooms)) return true;
  return almostEqual(bedrooms, selectedRooms) || almostEqual(bedrooms, Math.max(0, selectedRooms - 1));
};

const areStringArraysEqual = (left = [], right = []) => {
  if (left === right) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (String(left[index]) !== String(right[index])) return false;
  }
  return true;
};

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [filter, setFilter] = useState('all');
  const [citySearch, setCitySearch] = useState('');
  const [roomsSearch, setRoomsSearch] = useState('');
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
  const [circleSelection, setCircleSelection] = useState({
    active: false,
    propertyIds: [],
    radiusMeters: 0,
    center: null,
  });
  const [clearCircleSignal] = useState(0);
  const autoRetryTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const listScrollTimeoutRef = useRef(null);
  const history = useHistory();
  const location = useLocation();
  const [isListScrolling, setIsListScrolling] = useState(false);
  const [mobileDiscoveryView, setMobileDiscoveryView] = useState('map');
  const [drawModeToggleSignal, setDrawModeToggleSignal] = useState(0);
  const [isMapDrawModeActive, setIsMapDrawModeActive] = useState(false);

  // Clear any pending auto-retry timers
  const clearTimers = () => {
    if (autoRetryTimerRef.current) clearTimeout(autoRetryTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  };

  const handleListScroll = useCallback(() => {
    setIsListScrolling(true);
    if (listScrollTimeoutRef.current) {
      window.clearTimeout(listScrollTimeoutRef.current);
    }
    listScrollTimeoutRef.current = window.setTimeout(() => {
      setIsListScrolling(false);
      listScrollTimeoutRef.current = null;
    }, 420);
  }, []);

  const loadLiveSyncStatus = async () => {
    try {
      const response = await getPublicYad2SyncStatus();
      setLiveSyncStatus(response?.status || null);
    } catch (statusErr) {
      setLiveSyncStatus({
        unavailableReason:
          statusErr.response?.data?.message ||
          statusErr.message ||
          'Unable to load live Yad2 sync diagnostics.',
      });
    }
  };

  const getLiveUnavailableReason = () => {
    if (liveSyncStatus && typeof liveSyncStatus.unavailableReason === 'string' && liveSyncStatus.unavailableReason.trim()) {
      return liveSyncStatus.unavailableReason.trim();
    }
    if (liveSyncStatus && typeof liveSyncStatus.lastError === 'string' && liveSyncStatus.lastError.trim()) {
      return `Last sync failed: ${liveSyncStatus.lastError.trim()}.`;
    }
    if (liveSyncStatus && liveSyncStatus.lastResult?.skipped) {
      return `Last sync was skipped: ${liveSyncStatus.lastResult.reason || 'Unknown reason'}.`;
    }
    if (liveSyncStatus && liveSyncStatus.lastResult?.fetched === 0) {
      return 'Last sync returned zero listings from the feed.';
    }
    if (liveSyncStatus && !liveSyncStatus.lastFinishedAt) {
      return 'A live Yad2 sync has not completed yet.';
    }
    if (error && error !== '__starting_up__') return error;
    return 'Retry shortly while live feed diagnostics refresh.';
  };

  const getTopSyncErrorReasons = () => {
    if (!liveSyncStatus || !Array.isArray(liveSyncStatus.topErrorReasons)) return [];
    return liveSyncStatus.topErrorReasons
      .filter((reason) => typeof reason === 'string' && reason.trim())
      .slice(0, 3);
  };

  const getLiveSyncSummary = () => {
    if (!liveSyncStatus || typeof liveSyncStatus !== 'object') return '';
    const summary = [];
    summary.push(`Feed URL: ${liveSyncStatus.feedUrlConfigured ? 'configured' : 'missing'}`);
    const lastFinished = formatTimestamp(liveSyncStatus.lastFinishedAt);
    if (lastFinished) summary.push(`Last sync: ${lastFinished}`);
    const fetched = liveSyncStatus.lastResult?.fetched;
    if (typeof fetched === 'number') summary.push(`Fetched: ${fetched}`);
    const pruned = liveSyncStatus.lastResult?.pruned;
    if (typeof pruned === 'number') summary.push(`Pruned: ${pruned}`);
    return summary.join(' • ');
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextCity = String(params.get('q') || '').trim();
    const nextRooms = String(params.get('rooms') || '').trim();
    const nextTypeRaw = String(params.get('type') || '').toLowerCase();
    const nextType = nextTypeRaw === 'sale' || nextTypeRaw === 'rental' ? nextTypeRaw : 'all';
    const parseOptionalPrice = (rawValue) => {
      if (rawValue == null || rawValue === '') return '';
      const asNumber = Number(rawValue);
      if (Number.isNaN(asNumber)) return '';
      return String(clampPriceValue(asNumber));
    };
    let nextMinPrice = parseOptionalPrice(params.get('minPrice'));
    let nextMaxPrice = parseOptionalPrice(params.get('maxPrice'));
    if (nextMinPrice !== '' && nextMaxPrice !== '' && Number(nextMinPrice) > Number(nextMaxPrice)) {
      const low = String(Math.min(Number(nextMinPrice), Number(nextMaxPrice)));
      const high = String(Math.max(Number(nextMinPrice), Number(nextMaxPrice)));
      nextMinPrice = low;
      nextMaxPrice = high;
    }

    setCitySearch(nextCity);
    setRoomsSearch(nextRooms);
    setFilter(nextType);
    setMinPrice(nextMinPrice);
    setMaxPrice(nextMaxPrice);
  }, [location.search]);

  useEffect(() => {
    clearTimers();
    const fetchProperties = async () => {
      setLoading(true);
      setSlowLoad(false);
      setError('');
      setLiveSyncStatus(null);
      setAutoRetrySecondsLeft(0);
      const slowTimer = setTimeout(() => setSlowLoad(true), 8000);
      try {
        const params = { source: 'live-yad2' };
        if (filter !== 'all') params.type = filter;
        if (citySearch.trim()) params.city = citySearch.trim();
        if (roomsSearch.trim()) params.rooms = roomsSearch.trim();
        if (minPrice !== '') params.minPrice = minPrice;
        if (maxPrice !== '') params.maxPrice = maxPrice;
        const hasUserFilters = Object.keys(params).length > 1;
        const result = await getProperties(params);
        const data = result.data || [];
        setProperties(data);
        // If the API returns 0 results with no filters, the database itself is empty.
        // Keep the flag set until real data actually arrives so filtered searches
        // continue to show (locally filtered) demo listings.
        if (data.length > 0) {
          setDbIsEmpty(false);
          setLiveSyncStatus(null);
          writeCachedLiveListings(data);
        } else if (!hasUserFilters) {
          setDbIsEmpty(true);
          await loadLiveSyncStatus();
        }
      } catch (err) {
        const status = err.response && err.response.status;
        // 503 = DB not ready, 502 = Render proxy warming up.
        // !err.response means axios got no HTTP response at all (connection refused/reset
        // during cold-start). DNS failures can't happen here because the API uses a
        // relative URL (/api/...) resolved against the same origin.
        const isTransient = status === 503 || status === 502 || !err.response;
        const isTimeout = err.code === 'ECONNABORTED';
        const canFallbackToDemo = isTransient || isTimeout || (status >= 500 && status < 600);

        // Keep the beta site usable when backend/API is temporarily unavailable.
        // Prefer cached live listings; fall back to built-in demo listings only if no cache exists.
        let usedCachedLiveListings = false;
        if (canFallbackToDemo) {
          const cached = readCachedLiveListings();
          if (cached.length > 0) {
            setProperties(cached);
            setDbIsEmpty(false);
            usedCachedLiveListings = true;
          } else {
            setDbIsEmpty(true);
            setProperties([]);
            await loadLiveSyncStatus();
          }
        }

        if (isTransient && retryCount < MAX_AUTO_RETRIES) {
          // Server/DB still starting — auto-retry after RETRY_INTERVAL_MS
          const secs = RETRY_INTERVAL_MS / 1000;
          setAutoRetrySecondsLeft(secs);
          countdownTimerRef.current = setInterval(() => {
            setAutoRetrySecondsLeft((s) => (s > 1 ? s - 1 : 0));
          }, 1000);
          autoRetryTimerRef.current = setTimeout(() => {
            clearInterval(countdownTimerRef.current);
            setRetryCount((c) => c + 1);
          }, RETRY_INTERVAL_MS);
          if (!usedCachedLiveListings) setError('__starting_up__');
        } else if (canFallbackToDemo) {
          if (!usedCachedLiveListings) {
            setError('Using demo listings while the database is unavailable.');
          } else {
            setError('Live feed temporarily unavailable. Showing recent listings from cache.');
          }
        } else if (isTimeout) {
          setError('The server is taking too long to respond. It may still be starting up — please try again in a moment.');
        } else {
          setError(`Failed to load properties (HTTP ${status || 'unknown'}). Please try again.`);
        }
      } finally {
        clearTimeout(slowTimer);
        setSlowLoad(false);
        setLoading(false);
      }
    };
    fetchProperties();
    return clearTimers;
  }, [filter, citySearch, roomsSearch, minPrice, maxPrice, retryCount]);

  useEffect(() => () => {
    if (listScrollTimeoutRef.current) {
      window.clearTimeout(listScrollTimeoutRef.current);
      listScrollTimeoutRef.current = null;
    }
  }, []);

  const interestSummary = getInterestSummary();
  const favoritesCount = interestSummary.favoriteIds.length;
  const savedCount = interestSummary.savedIds.length;
  const favoriteIdsKey = (interestSummary.favoriteIds || []).map((id) => String(id)).join('|');
  const favoriteIdSet = useMemo(
    () => new Set((interestSummary.favoriteIds || []).map((id) => String(id))),
    [favoriteIdsKey]
  );

  const mapSourceProperties = useMemo(() => {
    let displayProperties;
    if (dbIsEmpty) {
      let samples = [...SAMPLE_PROPERTIES];
      if (filter !== 'all') samples = samples.filter((p) => p.type === filter);
      if (citySearch.trim()) {
        const q = citySearch.trim().toLowerCase();
        samples = samples.filter((p) => p.address?.city?.toLowerCase().includes(q));
      }
      if (roomsSearch.trim()) {
        samples = samples.filter((p) => matchesRoomsSelection(p.bedrooms, roomsSearch));
      }
      if (minPrice !== '') samples = samples.filter((p) => p.price >= Number(minPrice));
      if (maxPrice !== '') samples = samples.filter((p) => p.price <= Number(maxPrice));
      displayProperties = samples;
    } else {
      // Keep filters functional even when data is served from local cache fallback.
      displayProperties = [...properties];
      if (filter !== 'all') displayProperties = displayProperties.filter((p) => p?.type === filter);
      if (citySearch.trim()) {
        const q = citySearch.trim().toLowerCase();
        displayProperties = displayProperties.filter((p) => p?.address?.city?.toLowerCase().includes(q));
      }
      if (roomsSearch.trim()) {
        displayProperties = displayProperties.filter((p) => matchesRoomsSelection(p?.bedrooms, roomsSearch));
      }
      if (minPrice !== '') displayProperties = displayProperties.filter((p) => Number(p?.price) >= Number(minPrice));
      if (maxPrice !== '') displayProperties = displayProperties.filter((p) => Number(p?.price) <= Number(maxPrice));
    }

    if (favoritesOnly) {
      displayProperties = displayProperties.filter((property) => {
        const propertyId = property && (property._id || property.id);
        return propertyId ? favoriteIdSet.has(String(propertyId)) : false;
      });
    }

    return displayProperties.filter((property) => property && typeof property === 'object');
  }, [dbIsEmpty, filter, citySearch, roomsSearch, minPrice, maxPrice, properties, favoritesOnly, favoriteIdSet]);
  const circlePropertyIdSet = useMemo(
    () => new Set((circleSelection.propertyIds || []).map((propertyId) => String(propertyId))),
    [circleSelection.propertyIds]
  );
  const displayProperties = useMemo(() => {
    if (!circleSelection.active) return mapSourceProperties;
    return mapSourceProperties.filter((property) => {
      const propertyId = property && (property._id || property.id);
      return propertyId ? circlePropertyIdSet.has(String(propertyId)) : false;
    });
  }, [circleSelection.active, circlePropertyIdSet, mapSourceProperties]);
  const mobileWhatsAppHref = useMemo(() => {
    for (const property of mapSourceProperties) {
      if (!property || typeof property !== 'object') continue;
      const { street } = getAddressDisplay(property.address || {});
      const displayTitle =
        sanitizeReadableText(property, street)
        || sanitizeReadableText(property, property.title)
        || 'this listing';
      const whatsappHref = getPropertyWhatsAppHref(property, displayTitle);
      if (whatsappHref) return whatsappHref;
    }
    return '';
  }, [mapSourceProperties]);

  const handleCircleSelectionChange = useCallback((selection) => {
    const nextSelection = (!selection || typeof selection !== 'object')
      ? {
        active: false,
        propertyIds: [],
        radiusMeters: 0,
        center: null,
      }
      : {
        active: Boolean(selection.active),
        propertyIds: Array.isArray(selection.propertyIds) ? selection.propertyIds : [],
        radiusMeters: Number(selection.radiusMeters) || 0,
        center: selection.center || null,
      };

    setCircleSelection((previousSelection) => {
      const prevCenter = previousSelection && previousSelection.center ? previousSelection.center : null;
      const nextCenter = nextSelection.center;
      const sameCenter = (!prevCenter && !nextCenter)
        || (prevCenter && nextCenter && prevCenter.lat === nextCenter.lat && prevCenter.lng === nextCenter.lng);
      if (
        previousSelection.active === nextSelection.active
        && previousSelection.radiusMeters === nextSelection.radiusMeters
        && sameCenter
        && areStringArraysEqual(previousSelection.propertyIds, nextSelection.propertyIds)
      ) {
        return previousSelection;
      }
      return nextSelection;
    });
  }, []);
  // Decide what to render in the results area
  const renderResults = () => {
    if (loading) {
      return (
        <p className="status-message">
          {slowLoad
            ? 'Server is taking a moment to respond… please wait.'
            : 'Loading properties…'}
        </p>
      );
    }

    if (error && !dbIsEmpty) {
      return (
        <div className="status-panel">
          <p className="status-message status-message-error">{error}</p>
          <button className="secondary-btn" onClick={() => { clearTimers(); setRetryCount((c) => c + 1); }}>
            Try Again
          </button>
        </div>
      );
    }

    return (
      <div className='container'>
        {dbIsEmpty && (
          <div className="status-banner">
            <p>
              {error === '__starting_up__'
                ? `⏳ Connecting to database… retrying in ${autoRetrySecondsLeft}s. Showing demo listings in the meantime.`
                : '⚡ Live Yad2 feed is currently unavailable.'}
            </p>
            {error !== '__starting_up__' && (
              <p>{getLiveUnavailableReason()}</p>
            )}
            {error !== '__starting_up__' && getLiveSyncSummary() && <p>{getLiveSyncSummary()}</p>}
            {error !== '__starting_up__' && getTopSyncErrorReasons().length > 0 && (
              <div>
                <p><strong>Top sync error reasons:</strong></p>
                <ol>
                  {getTopSyncErrorReasons().map((reason, idx) => (
                    <li key={`sync-reason-${idx}`}>{reason}</li>
                  ))}
                </ol>
              </div>
            )}
            <button
              className="secondary-btn"
              onClick={() => { clearTimers(); setRetryCount((c) => c + 1); }}
            >
              Retry Connection
            </button>
          </div>
        )}
        {!dbIsEmpty && displayProperties.length === 0 && <p className="status-message">No properties found.</p>}
        {displayProperties.map((property, index) => {
          if (!property || typeof property !== 'object') return null;
          const propertyId = property._id || property.id;
          const canOpenDetail = Boolean(propertyId);
          const isYad2Media = isYad2LikeListing(property);
          const key = propertyId || `property-${index}`;
          const imageSrc =
            removeYad2ImageLogo(Array.isArray(property.images) ? property.images[0] : '', property.externalSource) ||
            `https://picsum.photos/seed/homekey-card-${key}/800/600`;
          const { street, locationLine } = getAddressDisplay(property.address);
          const displayStreet = dedupeRepeatingPhrase(sanitizeReadableText(property, street));
          const titleFromData = sanitizeReadableText(property, property.title);
          const displayLocation = sanitizeReadableText(property, locationLine);
          const displayTitle = displayStreet || titleFromData || displayLocation || 'Property listing';
          const shouldShowLocation = Boolean(
            displayLocation
            && displayLocation.toLowerCase() !== displayTitle.toLowerCase()
          );
          const monthly = property.financialDetails?.totalMonthlyPayment;
          const cardWhatsAppHref = getPropertyWhatsAppHref(property, displayTitle);
          const openPropertyDetail = () => {
            if (!canOpenDetail) return;
            history.push(`/properties/${propertyId}`, { previewProperty: property });
          };
          return (
            <div
              key={key}
              className={`property-card ${canOpenDetail ? 'is-clickable' : ''}`}
              onClick={openPropertyDetail}
              style={{ cursor: canOpenDetail ? 'pointer' : 'default' }}
            >
              <div className="property-card-image-wrap">
                <img className={`property-card-image ${isYad2Media ? 'yad2-image' : ''}`} src={imageSrc} alt={displayTitle || 'Property listing'} />
                <div className="property-card-top-tags">
                  <span className="property-card-listing-badge">Verified Listing</span>
                  <button
                    type="button"
                    className="property-card-favorite-btn"
                    aria-label="Save listing"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    ♡
                  </button>
                </div>
                {isYad2Media && (
                  <span className="yad2-logo-mask yad2-logo-mask--card" aria-hidden="true" />
                )}
                <HomeKeyLogoBadge compact className="image-corner-logo image-corner-logo--cover image-corner-logo--card" />
              </div>
              <div className="property-card-body">
                <h3 className={`property-card-title ${displayStreet ? 'property-card-title--street' : ''}`}>{displayTitle}</h3>
                {shouldShowLocation && <p className="property-card-location">{displayLocation}</p>}
                <p className="property-card-price">{formatCardPrice(property)}</p>
                <div className="property-card-stats" aria-label="Property highlights">
                  <span className="property-card-stat">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M3 12.4V8.9A1.9 1.9 0 0 1 4.9 7h14.2A1.9 1.9 0 0 1 21 8.9v3.5" />
                      <path d="M3 12.4h18V17H3z" />
                      <path d="M6 10h4.8v2.4H6z" />
                      <path d="M13.2 10H18v2.4h-4.8z" />
                      <path d="M4.2 17v1.8M19.8 17v1.8" />
                    </svg>
                    <span>{property.bedrooms ?? '—'} Beds</span>
                  </span>
                  <span className="property-card-stat">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M5 12h14v4.4A3.6 3.6 0 0 1 15.4 20H8.6A3.6 3.6 0 0 1 5 16.4V12Z" />
                      <path d="M8 12V8.8A2.8 2.8 0 0 1 10.8 6h1.6a1.6 1.6 0 0 1 0 3.2h-1" />
                      <path d="M7.2 20v1.4M16.8 20v1.4" />
                      <path d="M16.8 9.3l1.6 1.6M18.4 9.3l-1.6 1.6" />
                    </svg>
                    <span>{property.bathrooms ?? '—'} Baths</span>
                  </span>
                  <span className="property-card-stat">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M4 4h7v3h3V4h6v16h-6v-4h-4v4H4z" />
                      <path d="M11 4v5h3" />
                      <path d="M10 16v-3h4" />
                    </svg>
                    <span>{property.size ?? '—'} sqm</span>
                  </span>
                </div>
                <div className="property-card-actions">
                  <button
                    type="button"
                    className="property-card-action-btn property-card-action-btn--outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      openPropertyDetail();
                    }}
                    disabled={!canOpenDetail}
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    className="property-card-action-btn property-card-action-btn--charcoal"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!cardWhatsAppHref || typeof window === 'undefined') return;
                      window.open(cardWhatsAppHref, '_blank', 'noopener,noreferrer');
                    }}
                    disabled={!cardWhatsAppHref}
                  >
                    WhatsApp Agent
                  </button>
                </div>
                {monthly != null && (
                  <p className="property-card-extra">Estimated monthly: {formatCurrency(monthly)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="property-list-page">
      <section
        className={`desktop-discovery-layout ${mobileDiscoveryView === 'list' ? 'mobile-list-active' : 'mobile-map-active'}`}
        aria-label="Listings and map layout"
      >
        <div
          className={`desktop-discovery-list-column minimalist-scrollbar ${isListScrolling ? 'is-scrolling' : ''}`}
          onScroll={handleListScroll}
        >
          <div className="homepage-hero-shell">
            <section className="hero-banner">
              <img
                className="hero-banner-background-image"
                src={HERO_BACKGROUND_IMAGE}
                alt=""
                aria-hidden="true"
              />
              <div className="hero-banner-overlay" aria-hidden="true" />
              <div className="hero-banner-grid">
                <div className="hero-banner-copy">
                  <div className="hero-banner-copy-text">
                    <h1>Find Your Next Home in Israel.</h1>
                  </div>
                  <div className="homekey-logo-lockup hero-banner-logo" aria-label="HomeKey logo">
                    <img className="homekey-logo-lockup-image" src={heroBannerLogo} alt="HomeKey logo" />
                  </div>
                </div>
              </div>
            </section>
            <div className="reference-chip-row" aria-label="Featured collections">
              <span className="reference-chip reference-chip--dark">Dynamic Search Hub</span>
              <span className="reference-chip">New Developments</span>
              <span className="reference-chip">Immediate Entry</span>
              <span className="reference-chip is-active">Verified Listings</span>
              <span className="reference-chip">Pet Friendly</span>
              <span className="reference-chip">Decision Hub</span>
            </div>
          </div>
          <div className="property-interest-toolbar">
            <button
              type="button"
              className={`secondary-btn ${favoritesOnly ? 'active-interest-filter' : ''}`}
              onClick={() => setFavoritesOnly((value) => !value)}
            >
              {favoritesOnly ? 'Show All Listings' : 'Show Favorites Only'}
            </button>
          </div>
          <div className="property-interest-summary" aria-live="polite">
            <div className="property-interest-summary-counts">
              <span>Favorites: {favoritesCount}</span>
              <span>Saved file: {savedCount}</span>
            </div>
          </div>
          <div className="desktop-discovery-list-scroll">
            {renderResults()}
          </div>
        </div>
        <div className="desktop-discovery-map-column">
          <section className="google-listings-map-card" aria-label="Apartment location map">
            <GoogleListingsMap
              properties={loading ? [] : mapSourceProperties}
              onCircleSelectionChange={handleCircleSelectionChange}
              clearSignal={clearCircleSignal}
              drawModeToggleSignal={drawModeToggleSignal}
              onDrawModeChange={setIsMapDrawModeActive}
            />
          </section>
        </div>
      </section>
      <div className="mobile-thumb-zone-controls" aria-label="Thumb-zone map controls">
        <button
          type="button"
          className="mobile-thumb-zone-fab mobile-thumb-zone-fab--whatsapp"
          onClick={() => {
            if (!mobileWhatsAppHref || typeof window === 'undefined') return;
            window.open(mobileWhatsAppHref, '_blank', 'noopener,noreferrer');
          }}
          disabled={!mobileWhatsAppHref}
          aria-label="Open WhatsApp chat for a listing"
        >
          WA
        </button>
        <div className="mobile-discovery-toggle" role="group" aria-label="Switch between map and list views">
          <button
            type="button"
            className={`mobile-discovery-toggle-btn ${mobileDiscoveryView === 'list' ? 'is-active' : ''}`}
            onClick={() => setMobileDiscoveryView('list')}
            aria-pressed={mobileDiscoveryView === 'list'}
          >
            LIST VIEW
          </button>
          <button
            type="button"
            className={`mobile-discovery-toggle-btn ${mobileDiscoveryView === 'map' ? 'is-active' : ''}`}
            onClick={() => setMobileDiscoveryView('map')}
            aria-pressed={mobileDiscoveryView === 'map'}
          >
            MAP VIEW
          </button>
        </div>
        <button
          type="button"
          className={`mobile-thumb-zone-fab mobile-thumb-zone-fab--draw ${isMapDrawModeActive ? 'is-active' : ''}`}
          onClick={() => {
            setMobileDiscoveryView('map');
            setDrawModeToggleSignal((value) => value + 1);
          }}
          aria-label="Toggle draw mode on map"
          aria-pressed={isMapDrawModeActive}
        >
          Draw
        </button>
      </div>
    </div>
  );
};

export default PropertyList;

