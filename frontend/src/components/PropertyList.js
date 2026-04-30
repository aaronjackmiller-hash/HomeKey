import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { getProperties, getPublicYad2SyncStatus } from '../services/api';

const MAX_AUTO_RETRIES = 4; // 4 × 5s = 20s of auto-retry
const RETRY_INTERVAL_MS = 5000;
const SEARCH_DEBOUNCE_MS = 400;
const LIVE_LISTINGS_CACHE_KEY = 'homekey:live-listings-cache:v1';

const formatCurrency = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `₪${Number(value).toLocaleString()}`;
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

// Fallback sample properties shown when the database returns no results
const SAMPLE_PROPERTIES = [
  {
    _id: 'sample-1',
    title: 'Spacious 4-Room Apartment in Tel Aviv Center',
    type: 'sale',
    price: 4200000,
    address: { city: 'Tel Aviv', state: 'Tel Aviv District' },
    bedrooms: 3,
    bathrooms: 2,
    size: 110,
    images: ['https://picsum.photos/seed/homekey1/800/600'],
  },
  {
    _id: 'sample-2',
    title: 'Modern Studio in Florentin',
    type: 'rental',
    price: 5500,
    address: { city: 'Tel Aviv', state: 'Tel Aviv District' },
    bedrooms: 1,
    bathrooms: 1,
    size: 42,
    images: ['https://picsum.photos/seed/homekey2/800/600'],
  },
  {
    _id: 'sample-3',
    title: 'Penthouse with Sea View — Haifa Carmel',
    type: 'sale',
    price: 3800000,
    address: { city: 'Haifa', state: 'Haifa District' },
    bedrooms: 4,
    bathrooms: 3,
    size: 195,
    images: ['https://picsum.photos/seed/homekey3/800/600'],
  },
  {
    _id: 'sample-4',
    title: '3-Room Garden Apartment in Jerusalem — Rechavia',
    type: 'sale',
    price: 3200000,
    address: { city: 'Jerusalem', state: 'Jerusalem District' },
    bedrooms: 2,
    bathrooms: 1,
    size: 85,
    images: ['https://picsum.photos/seed/homekey4/800/600'],
  },
  {
    _id: 'sample-5',
    title: 'Luxury Rental — Herzliya Pituah Villa',
    type: 'rental',
    price: 35000,
    address: { city: 'Herzliya', state: 'Center District' },
    bedrooms: 6,
    bathrooms: 4,
    size: 420,
    images: ['https://picsum.photos/seed/homekey5/800/600'],
  },
  {
    _id: 'sample-6',
    title: "Investor Special — 2-Room in Be'er Sheva",
    type: 'sale',
    price: 750000,
    address: { city: "Be'er Sheva", state: 'South District' },
    bedrooms: 2,
    bathrooms: 1,
    size: 55,
    images: ['https://picsum.photos/seed/homekey6/800/600'],
  },
  {
    _id: 'sample-7',
    title: "New-Build 5-Room in Ra'anana",
    type: 'sale',
    price: 3600000,
    address: { city: "Ra'anana", state: 'Center District' },
    bedrooms: 4,
    bathrooms: 2,
    size: 148,
    images: ['https://picsum.photos/seed/homekey7/800/600'],
  },
  {
    _id: 'sample-8',
    title: 'Charming Old City Apartment — Jaffa Port',
    type: 'rental',
    price: 9500,
    address: { city: 'Jaffa', state: 'Tel Aviv District' },
    bedrooms: 2,
    bathrooms: 1,
    size: 78,
    images: ['https://picsum.photos/seed/homekey8/800/600'],
  },
];

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [filter, setFilter] = useState('all');
  // Local input values update instantly so typing is never interrupted
  const [cityInput, setCityInput] = useState('');
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  // Debounced search values that actually trigger the API call
  const [citySearch, setCitySearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [error, setError] = useState('');
  const [dbIsEmpty, setDbIsEmpty] = useState(false);
  const [liveSyncStatus, setLiveSyncStatus] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetrySecondsLeft, setAutoRetrySecondsLeft] = useState(0);
  const autoRetryTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const debounceRef = useRef(null);
  const history = useHistory();

  // Clear any pending auto-retry timers
  const clearTimers = () => {
    if (autoRetryTimerRef.current) clearTimeout(autoRetryTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  };

  // Debounce input changes so the API is not called on every keystroke
  const handleCityChange = (e) => {
    const val = e.target.value;
    setCityInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setCitySearch(val), SEARCH_DEBOUNCE_MS);
  };

  const handleMinPriceChange = (e) => {
    const val = e.target.value;
    setMinPriceInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setMinPrice(val), SEARCH_DEBOUNCE_MS);
  };

  const handleMaxPriceChange = (e) => {
    const val = e.target.value;
    setMaxPriceInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setMaxPrice(val), SEARCH_DEBOUNCE_MS);
  };

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCityInput('');
    setMinPriceInput('');
    setMaxPriceInput('');
    setCitySearch('');
    setMinPrice('');
    setMaxPrice('');
    setFilter('all');
  };

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
  }, [filter, citySearch, minPrice, maxPrice, retryCount]);

  const handleSearch = (e) => {
    e.preventDefault();
    // Flush any pending debounce immediately on explicit Search button click
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCitySearch(cityInput);
    setMinPrice(minPriceInput);
    setMaxPrice(maxPriceInput);
  };

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

    // When the database is empty, filter the local SAMPLE_PROPERTIES to match
      // whatever type/city/price filters the user has active so searches still work.
    let displayProperties;
    if (dbIsEmpty) {
      let samples = [...SAMPLE_PROPERTIES];
      if (filter !== 'all') samples = samples.filter((p) => p.type === filter);
      if (citySearch.trim()) {
        const q = citySearch.trim().toLowerCase();
        samples = samples.filter((p) => p.address?.city?.toLowerCase().includes(q));
      }
      if (minPrice !== '') samples = samples.filter((p) => p.price >= Number(minPrice));
      if (maxPrice !== '') samples = samples.filter((p) => p.price <= Number(maxPrice));
      displayProperties = samples;
    } else {
      displayProperties = properties;
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
          const isSample = typeof propertyId === 'string' && propertyId.startsWith('sample-');
          const canOpenDetail = Boolean(propertyId) && !isSample;
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
          return (
            <div
              key={key}
              className={`property-card ${canOpenDetail ? 'is-clickable' : ''}`}
              onClick={() => canOpenDetail && history.push(`/properties/${propertyId}`)}
              style={{ cursor: canOpenDetail ? 'pointer' : 'default' }}
            >
              <img className="property-card-image" src={imageSrc} alt={displayTitle || 'Property listing'} />
              <div className="property-card-body">
                <h3 className={`property-card-title ${displayStreet ? 'property-card-title--street' : ''}`}>{displayTitle}</h3>
                {shouldShowLocation && <p className="property-card-location">{displayLocation}</p>}
                <p className="property-card-price">{formatCurrency(property.price)}</p>
                <p className="property-card-stats">
                  {property.bedrooms ?? '—'} bed • {property.bathrooms ?? '—'} bath • {property.size ?? '—'} sqm
                </p>
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
      <section className="hero-banner">
        <p className="hero-kicker">Beta Property Portal</p>
        <h1>Find your next home in Israel</h1>
      </section>

      <section className="search-panel">
        <form className="search-form" onSubmit={handleSearch}>
          <div className="input-field search-input">
            <label>City</label>
            <input
              type="text"
              placeholder="e.g. Tel Aviv"
              value={cityInput}
              onChange={handleCityChange}
            />
          </div>
          <div className="input-field search-input">
            <label>Min Price (₪)</label>
            <input
              type="number"
              placeholder="0"
              min="0"
              value={minPriceInput}
              onChange={handleMinPriceChange}
            />
          </div>
          <div className="input-field search-input">
            <label>Max Price (₪)</label>
            <input
              type="number"
              placeholder="Any"
              min="0"
              value={maxPriceInput}
              onChange={handleMaxPriceChange}
            />
          </div>
          <button type="submit" className="primary-btn search-btn">Search</button>
          <button type="button" onClick={handleClear} className="secondary-btn search-btn">
            Clear
          </button>
        </form>
      </section>

      <div className='tabs pill-tabs'>
        <button className={filter === 'all' ? 'active-tab' : ''} onClick={() => setFilter('all')}>All</button>
        <button className={filter === 'rental' ? 'active-tab' : ''} onClick={() => setFilter('rental')}>Rental</button>
        <button className={filter === 'sale' ? 'active-tab' : ''} onClick={() => setFilter('sale')}>For Sale</button>
      </div>
      {renderResults()}
    </div>
  );
};

export default PropertyList;

