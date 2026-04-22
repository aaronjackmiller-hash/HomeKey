import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { getProperties } from '../services/api';

const MAX_AUTO_RETRIES = 4; // 4 × 5s = 20s of auto-retry
const RETRY_INTERVAL_MS = 5000;
const SEARCH_DEBOUNCE_MS = 400;

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

  useEffect(() => {
    clearTimers();
    const fetchProperties = async () => {
      setLoading(true);
      setSlowLoad(false);
      setError('');
      setAutoRetrySecondsLeft(0);
      const slowTimer = setTimeout(() => setSlowLoad(true), 8000);
      try {
        const params = {};
        if (filter !== 'all') params.type = filter;
        if (citySearch.trim()) params.city = citySearch.trim();
        if (minPrice !== '') params.minPrice = minPrice;
        if (maxPrice !== '') params.maxPrice = maxPrice;
        const hasFilters = Object.keys(params).length > 0;
        const result = await getProperties(params);
        const data = result.data || [];
        setProperties(data);
        // If the API returns 0 results with no filters, the database itself is empty.
        // Keep the flag set until real data actually arrives so filtered searches
        // continue to show (locally filtered) demo listings.
        if (data.length > 0) {
          setDbIsEmpty(false);
        } else if (!hasFilters) {
          setDbIsEmpty(true);
        }
      } catch (err) {
        const status = err.response && err.response.status;
        // 503 = DB not ready, 502 = Render proxy warming up.
        // !err.response means axios got no HTTP response at all (connection refused/reset
        // during cold-start). DNS failures can't happen here because the API uses a
        // relative URL (/api/...) resolved against the same origin.
        const isTransient = status === 503 || status === 502 || !err.response;
        const isTimeout = err.code === 'ECONNABORTED';

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
          setError('__starting_up__');
        } else if (isTransient) {
          setError('Database is unavailable. Please verify your MongoDB connection string (MONGODB_URI) is set correctly in your hosting environment.');
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
        <p style={{ padding: '16px 20px' }}>
          {slowLoad
            ? 'Server is taking a moment to respond… please wait.'
            : 'Loading properties…'}
        </p>
      );
    }

    if (error === '__starting_up__') {
      return (
        <div style={{ padding: '16px 20px' }}>
          <p>⏳ Connecting to database… retrying in {autoRetrySecondsLeft}s</p>
          <p style={{ color: '#888', fontSize: '0.9em' }}>
            The server is having trouble reaching the database. Retrying automatically.
          </p>
          <button onClick={() => { clearTimers(); setRetryCount((c) => c + 1); }}>
            Retry Now
          </button>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ padding: '16px 20px' }}>
          <p style={{ color: 'red' }}>{error}</p>
          <button onClick={() => { clearTimers(); setRetryCount((c) => c + 1); }}>Try Again</button>
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
          <p style={{ width: '100%', margin: '0 0 12px', color: '#888', fontSize: '0.9em' }}>
            ⚡ Showing demo listings — connect your database to see real properties.
          </p>
        )}
        {!dbIsEmpty && displayProperties.length === 0 && <p>No properties found.</p>}
        {displayProperties.map((property) => (
          <div
            key={property._id}
            className='property-card'
            onClick={() => !property._id.startsWith('sample-') && history.push(`/properties/${property._id}`)}
            style={{ cursor: property._id.startsWith('sample-') ? 'default' : 'pointer' }}
          >
            {property.images && property.images[0] && (
              <img src={property.images[0]} alt={property.title} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '4px' }} />
            )}
            <h3>{property.title}</h3>
            <p>{property.address?.city}{property.address?.city && property.address?.state ? ', ' : ''}{property.address?.state}</p>
            <p><strong>₪{property.price?.toLocaleString()}</strong> &bull; {property.type === 'rental' ? 'Rental' : 'For Sale'}</p>
            <p>{property.bedrooms} bed &bull; {property.bathrooms} bath &bull; {property.size} sqm</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '16px 20px', background: '#f8f8f8', alignItems: 'flex-end' }}>
        <div className="input-field" style={{ marginBottom: 0, flex: '1 1 200px' }}>
          <label>City</label>
          <input
            type="text"
            placeholder="e.g. Tel Aviv"
            value={cityInput}
            onChange={handleCityChange}
          />
        </div>
        <div className="input-field" style={{ marginBottom: 0, flex: '1 1 130px' }}>
          <label>Min Price (₪)</label>
          <input
            type="number"
            placeholder="0"
            min="0"
            value={minPriceInput}
            onChange={handleMinPriceChange}
          />
        </div>
        <div className="input-field" style={{ marginBottom: 0, flex: '1 1 130px' }}>
          <label>Max Price (₪)</label>
          <input
            type="number"
            placeholder="Any"
            min="0"
            value={maxPriceInput}
            onChange={handleMaxPriceChange}
          />
        </div>
        <button type="submit" style={{ alignSelf: 'flex-end', padding: '10px 20px' }}>Search</button>
        <button
          type="button"
          onClick={handleClear}
          style={{ alignSelf: 'flex-end', padding: '10px 20px' }}
        >
          Clear
        </button>
      </form>
      <div className='tabs'>
        <button onClick={() => setFilter('all')}>All</button>
        <button onClick={() => setFilter('rental')}>Rental</button>
        <button onClick={() => setFilter('sale')}>For Sale</button>
      </div>
      {renderResults()}
    </div>
  );
};

export default PropertyList;

