import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { getProperties } from '../services/api';

const MAX_AUTO_RETRIES = 4; // 4 × 5s = 20s of auto-retry
const RETRY_INTERVAL_MS = 5000;

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [filter, setFilter] = useState('all');
  const [citySearch, setCitySearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetrySecondsLeft, setAutoRetrySecondsLeft] = useState(0);
  const autoRetryTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const history = useHistory();

  // Clear any pending auto-retry timers
  const clearTimers = () => {
    if (autoRetryTimerRef.current) clearTimeout(autoRetryTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
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
        const result = await getProperties(params);
        setProperties(result.data || []);
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
    // Filter state changes from onChange handlers already trigger the useEffect.
    // This handler just prevents the default form submission (page reload).
  };

  if (loading) {
    return (
      <p>
        {slowLoad
          ? 'Server is taking a moment to respond… please wait.'
          : 'Loading properties…'}
      </p>
    );
  }

  if (error === '__starting_up__') {
    return (
      <div>
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
      <div>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={() => { clearTimers(); setRetryCount((c) => c + 1); }}>Try Again</button>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '16px 20px', background: '#f8f8f8', alignItems: 'flex-end' }}>
        <div className="input-field" style={{ marginBottom: 0, flex: '1 1 200px' }}>
          <label>City</label>
          <input
            type="text"
            placeholder="e.g. Tel Aviv"
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
          />
        </div>
        <div className="input-field" style={{ marginBottom: 0, flex: '1 1 130px' }}>
          <label>Min Price (₪)</label>
          <input
            type="number"
            placeholder="0"
            min="0"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
        </div>
        <div className="input-field" style={{ marginBottom: 0, flex: '1 1 130px' }}>
          <label>Max Price (₪)</label>
          <input
            type="number"
            placeholder="Any"
            min="0"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
        <button type="submit" style={{ alignSelf: 'flex-end', padding: '10px 20px' }}>Search</button>
        <button
          type="button"
          onClick={() => { setCitySearch(''); setMinPrice(''); setMaxPrice(''); setFilter('all'); }}
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
      <div className='container'>
        {properties.length === 0 && <p>No properties found.</p>}
        {properties.map((property) => (
          <div
            key={property._id}
            className='property-card'
            onClick={() => history.push(`/properties/${property._id}`)}
            style={{ cursor: 'pointer' }}
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
    </div>
  );
};

export default PropertyList;

