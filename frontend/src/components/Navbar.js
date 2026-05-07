import React, { useEffect, useMemo, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import homeKeyWordmark from '../assets/homekey-logo-strip-tight.png';

const PRICE_SLIDER_MIN = 0;
const PRICE_SLIDER_MAX = 20000;
const PRICE_SLIDER_STEP = 500;

const clampPriceValue = (value) => {
  const asNumber = Number(value);
  if (Number.isNaN(asNumber)) return PRICE_SLIDER_MIN;
  return Math.min(PRICE_SLIDER_MAX, Math.max(PRICE_SLIDER_MIN, asNumber));
};

const formatPriceSliderLabel = (value, isUpper = false) => {
  const normalized = clampPriceValue(value);
  if (isUpper && normalized >= PRICE_SLIDER_MAX) return `₪ ${normalized.toLocaleString()}+`;
  return `₪ ${normalized.toLocaleString()}`;
};

const getPriceSummaryLabel = (minValue, maxValue) => {
  const minLabel = formatPriceSliderLabel(minValue);
  const maxLabel = formatPriceSliderLabel(maxValue, true);
  return `${minLabel} - ${maxLabel}`;
};

const sanitizeListingType = (rawValue) => {
  const normalized = String(rawValue || '').toLowerCase();
  if (normalized === 'sale' || normalized === 'rental') return normalized;
  return 'all';
};

const parseSearchFromLocation = (search = '') => {
  const params = new URLSearchParams(search);
  const city = params.get('q') || '';
  const rooms = params.get('rooms') || '';
  const listingType = sanitizeListingType(params.get('type') || 'sale');
  const allFilters = params.get('allFilters') || '';
  const minRaw = params.get('minPrice');
  const maxRaw = params.get('maxPrice');
  const hasMin = minRaw != null && minRaw !== '';
  const hasMax = maxRaw != null && maxRaw !== '';
  let minPriceInput = hasMin ? clampPriceValue(minRaw) : PRICE_SLIDER_MIN;
  let maxPriceInput = hasMax ? clampPriceValue(maxRaw) : PRICE_SLIDER_MAX;
  if (minPriceInput > maxPriceInput) {
    const midpoint = Math.round((minPriceInput + maxPriceInput) / 2 / PRICE_SLIDER_STEP) * PRICE_SLIDER_STEP;
    minPriceInput = midpoint;
    maxPriceInput = midpoint;
  }
  return {
    city,
    rooms,
    listingType,
    allFilters,
    minPriceInput,
    maxPriceInput,
  };
};

const buildSearchQuery = ({
  city,
  rooms,
  listingType,
  allFilters,
  minPriceInput,
  maxPriceInput,
}) => {
  const params = new URLSearchParams();
  const trimmedCity = String(city || '').trim();
  if (trimmedCity) params.set('q', trimmedCity);
  const trimmedRooms = String(rooms || '').trim();
  if (trimmedRooms) params.set('rooms', trimmedRooms);
  const normalizedType = sanitizeListingType(listingType);
  if (normalizedType !== 'all') params.set('type', normalizedType);
  const trimmedAllFilters = String(allFilters || '').trim();
  if (trimmedAllFilters) params.set('allFilters', trimmedAllFilters);
  if (Number(minPriceInput) > PRICE_SLIDER_MIN) params.set('minPrice', String(minPriceInput));
  if (Number(maxPriceInput) < PRICE_SLIDER_MAX) params.set('maxPrice', String(maxPriceInput));
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
};

const Navbar = () => {
  const history = useHistory();
  const location = useLocation();
  const parsedFromLocation = useMemo(
    () => parseSearchFromLocation(location.search),
    [location.search]
  );
  const [city, setCity] = useState(parsedFromLocation.city);
  const [rooms, setRooms] = useState(parsedFromLocation.rooms);
  const [listingType, setListingType] = useState(parsedFromLocation.listingType);
  const [allFilters, setAllFilters] = useState(parsedFromLocation.allFilters);
  const [minPriceInput, setMinPriceInput] = useState(parsedFromLocation.minPriceInput);
  const [maxPriceInput, setMaxPriceInput] = useState(parsedFromLocation.maxPriceInput);
  const [priceExpanded, setPriceExpanded] = useState(false);
  const priceSliderRange = PRICE_SLIDER_MAX - PRICE_SLIDER_MIN;
  const minSliderPercent = ((minPriceInput - PRICE_SLIDER_MIN) / priceSliderRange) * 100;
  const maxSliderPercent = ((maxPriceInput - PRICE_SLIDER_MIN) / priceSliderRange) * 100;

  useEffect(() => {
    setCity(parsedFromLocation.city);
    setRooms(parsedFromLocation.rooms);
    setListingType(parsedFromLocation.listingType);
    setAllFilters(parsedFromLocation.allFilters);
    setMinPriceInput(parsedFromLocation.minPriceInput);
    setMaxPriceInput(parsedFromLocation.maxPriceInput);
    setPriceExpanded(false);
  }, [parsedFromLocation]);

  const applySearch = ({
    nextCity = city,
    nextRooms = rooms,
    nextListingType = listingType,
    nextAllFilters = allFilters,
    nextMinPriceInput = minPriceInput,
    nextMaxPriceInput = maxPriceInput,
  } = {}) => {
    const nextSearch = buildSearchQuery({
      city: nextCity,
      rooms: nextRooms,
      listingType: nextListingType,
      allFilters: nextAllFilters,
      minPriceInput: nextMinPriceInput,
      maxPriceInput: nextMaxPriceInput,
    });
    if (location.pathname === '/' && location.search === nextSearch) return;
    history.replace({
      pathname: '/',
      search: nextSearch,
    });
  };

  const handleMinPriceSliderChange = (event) => {
    const nextValue = clampPriceValue(event.target.value);
    const maxAllowedMin = Math.max(PRICE_SLIDER_MIN, maxPriceInput - PRICE_SLIDER_STEP);
    const nextMinPriceInput = Math.min(nextValue, maxAllowedMin);
    setMinPriceInput(nextMinPriceInput);
    applySearch({ nextMinPriceInput });
  };

  const handleMaxPriceSliderChange = (event) => {
    const nextValue = clampPriceValue(event.target.value);
    const minAllowedMax = Math.min(PRICE_SLIDER_MAX, minPriceInput + PRICE_SLIDER_STEP);
    const nextMaxPriceInput = Math.max(nextValue, minAllowedMax);
    setMaxPriceInput(nextMaxPriceInput);
    applySearch({ nextMaxPriceInput });
  };

  const handleHeaderSearchSubmit = (event) => {
    event.preventDefault();
    applySearch();
    setPriceExpanded(false);
  };

  const hasCustomPrice = minPriceInput > PRICE_SLIDER_MIN || maxPriceInput < PRICE_SLIDER_MAX;

  return (
    <nav className="premium-header" aria-label="Primary navigation">
      <div className="premium-header__inner">
        <div className="premium-header__brand-cell">
          <Link to="/" className="premium-header__brand" aria-label="HomeKey home">
            <img className="premium-header__brand-image" src={homeKeyWordmark} alt="HomeKey logo" />
          </Link>
        </div>

        <div className="premium-header__search-cell">
          <form className="premium-header__search-form" onSubmit={handleHeaderSearchSubmit}>
            <div className="premium-header__search-row premium-header__search-row--top">
              <div className="premium-header__search-item premium-header__search-item--query">
                <input
                  id="header-search-query"
                  type="text"
                  placeholder="Search city, neighborhood or listing"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  onBlur={(event) => applySearch({ nextCity: event.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="premium-header__search-item premium-header__search-item--type">
                <select
                  id="header-search-type"
                  value={listingType}
                  onChange={(event) => {
                    const nextListingType = event.target.value;
                    setListingType(nextListingType);
                    applySearch({ nextListingType });
                  }}
                >
                  <option value="sale">sale</option>
                  <option value="rental">rent</option>
                  <option value="all">all</option>
                </select>
              </div>
            </div>
            <div className="premium-header__search-row premium-header__search-row--bottom">
              <div className="premium-header__search-item premium-header__search-item--price">
                <button
                  id="header-search-price-toggle"
                  type="button"
                  className="premium-header__price-toggle"
                  onClick={() => setPriceExpanded((value) => !value)}
                  aria-expanded={priceExpanded}
                  aria-controls="header-price-slider-panel"
                >
                  <span>{hasCustomPrice ? getPriceSummaryLabel(minPriceInput, maxPriceInput) : 'Price'}</span>
                  <span className="premium-header__price-caret" aria-hidden="true">{priceExpanded ? '▲' : '▼'}</span>
                </button>
                <div id="header-price-slider-panel" className={`premium-header__price-panel ${priceExpanded ? 'is-open' : ''}`}>
                  <div className="premium-header__price-values" aria-hidden="true">
                    <span>{formatPriceSliderLabel(minPriceInput)}</span>
                    <span>—</span>
                    <span>{formatPriceSliderLabel(maxPriceInput, true)}</span>
                  </div>
                  <div
                    className="premium-header__price-track"
                    style={{
                      '--min-price-percent': `${minSliderPercent}%`,
                      '--max-price-percent': `${maxSliderPercent}%`,
                    }}
                  >
                    <input
                      type="range"
                      min={PRICE_SLIDER_MIN}
                      max={PRICE_SLIDER_MAX}
                      step={PRICE_SLIDER_STEP}
                      value={minPriceInput}
                      onChange={handleMinPriceSliderChange}
                      className="premium-header__price-slider premium-header__price-slider--min"
                      aria-label="Minimum price"
                    />
                    <input
                      type="range"
                      min={PRICE_SLIDER_MIN}
                      max={PRICE_SLIDER_MAX}
                      step={PRICE_SLIDER_STEP}
                      value={maxPriceInput}
                      onChange={handleMaxPriceSliderChange}
                      className="premium-header__price-slider premium-header__price-slider--max"
                      aria-label="Maximum price"
                    />
                  </div>
                </div>
              </div>
              <div className="premium-header__search-item premium-header__search-item--rooms">
                <select
                  id="header-search-rooms"
                  value={rooms}
                  onChange={(event) => {
                    const nextRooms = event.target.value;
                    setRooms(nextRooms);
                    applySearch({ nextRooms });
                  }}
                >
                  <option value="">Rooms/Baths</option>
                  <option value="1">1+ Rooms</option>
                  <option value="2">2+ Rooms</option>
                  <option value="3">3+ Rooms</option>
                  <option value="4">4+ Rooms</option>
                  <option value="5+">5+ Rooms</option>
                </select>
              </div>
              <div className="premium-header__search-item premium-header__search-item--all-filters">
                <select
                  id="header-search-filter"
                  value={allFilters}
                  onChange={(event) => {
                    const nextAllFilters = event.target.value;
                    setAllFilters(nextAllFilters);
                    applySearch({ nextAllFilters });
                  }}
                >
                  <option value="">All Filters</option>
                  <option value="newest">Newest</option>
                  <option value="verified">Verified</option>
                  <option value="price-low-high">Price: Low to High</option>
                  <option value="price-high-low">Price: High to Low</option>
                </select>
              </div>
            </div>
            <button type="submit" className="premium-header__search-submit" aria-label="Apply search">Search</button>
          </form>
        </div>

        <div className="premium-header__actions premium-header__actions-cell">
          <button className="premium-header__language-toggle" type="button" aria-label="Toggle language">
            <span className="premium-header__flag-icon" aria-hidden="true">
              <span className="premium-header__flag-star">✡</span>
            </span>
            <span className="premium-header__language-text">He</span>
          </button>
          <Link to="/add-listing" className="premium-header__cta">List a Property</Link>
          <Link to="/login" className="premium-header__login">Login</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
