import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import homeKeyWordmark from '../assets/H Logo Gemini_Generated_Image_8ckrj88ckrj88ckr.png';
import { getInterestSummary } from '../utils/propertyInterest';

const PRICE_SLIDER_MIN = 0;
const PRICE_SLIDER_MAX = 20000;
const PRICE_SLIDER_STEP = 500;
const ROOM_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'studio', label: 'Studio' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4+', label: '4+' },
];
const BATH_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3+', label: '3+' },
];

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

const getRoomsBathsSummaryLabel = (rooms = '', baths = '') => {
  const normalizedRooms = String(rooms || '').trim();
  const normalizedBaths = String(baths || '').trim();
  if (!normalizedRooms && !normalizedBaths) return 'Rooms/Baths';
  const roomOption = ROOM_OPTIONS.find((option) => option.value === normalizedRooms);
  const bathOption = BATH_OPTIONS.find((option) => option.value === normalizedBaths);
  const summaryParts = [];
  if (roomOption) summaryParts.push(`Rooms: ${roomOption.label}`);
  if (bathOption) summaryParts.push(`Baths: ${bathOption.label}`);
  return summaryParts.join(' • ');
};

const parseSearchFromLocation = (search = '') => {
  const params = new URLSearchParams(search);
  const city = params.get('q') || '';
  const rooms = params.get('rooms') || '';
  const baths = params.get('baths') || '';
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
    baths,
    listingType,
    allFilters,
    minPriceInput,
    maxPriceInput,
  };
};

const buildSearchQuery = ({
  city,
  rooms,
  baths,
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
  const trimmedBaths = String(baths || '').trim();
  if (trimmedBaths) params.set('baths', trimmedBaths);
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
  const [baths, setBaths] = useState(parsedFromLocation.baths);
  const [listingType, setListingType] = useState(parsedFromLocation.listingType);
  const [allFilters, setAllFilters] = useState(parsedFromLocation.allFilters);
  const [minPriceInput, setMinPriceInput] = useState(parsedFromLocation.minPriceInput);
  const [maxPriceInput, setMaxPriceInput] = useState(parsedFromLocation.maxPriceInput);
  const [priceExpanded, setPriceExpanded] = useState(false);
  const [roomsBathsExpanded, setRoomsBathsExpanded] = useState(false);
  const [roomsDraft, setRoomsDraft] = useState(parsedFromLocation.rooms);
  const [bathsDraft, setBathsDraft] = useState(parsedFromLocation.baths);
  const [interestVersion, setInterestVersion] = useState(0);
  const roomsBathsRef = useRef(null);
  const priceSliderRange = PRICE_SLIDER_MAX - PRICE_SLIDER_MIN;
  const minSliderPercent = ((minPriceInput - PRICE_SLIDER_MIN) / priceSliderRange) * 100;
  const maxSliderPercent = ((maxPriceInput - PRICE_SLIDER_MIN) / priceSliderRange) * 100;

  useEffect(() => {
    setCity(parsedFromLocation.city);
    setRooms(parsedFromLocation.rooms);
    setBaths(parsedFromLocation.baths);
    setListingType(parsedFromLocation.listingType);
    setAllFilters(parsedFromLocation.allFilters);
    setMinPriceInput(parsedFromLocation.minPriceInput);
    setMaxPriceInput(parsedFromLocation.maxPriceInput);
    setRoomsDraft(parsedFromLocation.rooms);
    setBathsDraft(parsedFromLocation.baths);
    setPriceExpanded(false);
    setRoomsBathsExpanded(false);
  }, [parsedFromLocation]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleInterestUpdated = () => {
      setInterestVersion((value) => value + 1);
    };
    window.addEventListener('homekey:interest-updated', handleInterestUpdated);
    return () => {
      window.removeEventListener('homekey:interest-updated', handleInterestUpdated);
    };
  }, []);

  useEffect(() => {
    if (!roomsBathsExpanded) return undefined;
    const handlePointerDown = (event) => {
      if (roomsBathsRef.current && !roomsBathsRef.current.contains(event.target)) {
        setRoomsBathsExpanded(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setRoomsBathsExpanded(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [roomsBathsExpanded]);

  const applySearch = ({
    nextCity = city,
    nextRooms = rooms,
    nextBaths = baths,
    nextListingType = listingType,
    nextAllFilters = allFilters,
    nextMinPriceInput = minPriceInput,
    nextMaxPriceInput = maxPriceInput,
  } = {}) => {
    const nextSearch = buildSearchQuery({
      city: nextCity,
      rooms: nextRooms,
      baths: nextBaths,
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
    setRoomsBathsExpanded(false);
  };

  const hasCustomPrice = minPriceInput > PRICE_SLIDER_MIN || maxPriceInput < PRICE_SLIDER_MAX;
  const roomsBathsSummaryLabel = getRoomsBathsSummaryLabel(rooms, baths);
  const interestSummary = useMemo(() => getInterestSummary(), [interestVersion]);
  const likedCount = (interestSummary.favoriteIds || []).length;
  const heartClickCount = Number(interestSummary.heartClickCount) || 0;

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
                  <option value="rental">Rent</option>
                  <option value="sale">Sale</option>
                </select>
              </div>
            </div>
            <div className="premium-header__search-row premium-header__search-row--bottom">
              <div className="premium-header__search-item premium-header__search-item--price">
                <button
                  id="header-search-price-toggle"
                  type="button"
                  className="premium-header__price-toggle"
                  onClick={() => {
                    setRoomsBathsExpanded(false);
                    setPriceExpanded((value) => !value);
                  }}
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
              <div className="premium-header__search-item premium-header__search-item--rooms" ref={roomsBathsRef}>
                <button
                  id="header-search-rooms-toggle"
                  type="button"
                  className="premium-header__rooms-toggle"
                  onClick={() => {
                    setPriceExpanded(false);
                    setRoomsBathsExpanded((isExpanded) => {
                      const nextExpanded = !isExpanded;
                      if (nextExpanded) {
                        setRoomsDraft(rooms);
                        setBathsDraft(baths);
                      }
                      return nextExpanded;
                    });
                  }}
                  aria-expanded={roomsBathsExpanded}
                  aria-controls="header-rooms-baths-panel"
                >
                  <span>{roomsBathsSummaryLabel}</span>
                  <span className="premium-header__price-caret" aria-hidden="true">{roomsBathsExpanded ? '▲' : '▼'}</span>
                </button>
                <div
                  id="header-rooms-baths-panel"
                  className={`premium-header__rooms-panel ${roomsBathsExpanded ? 'is-open' : ''}`}
                >
                  <div className="premium-header__rooms-section">
                    <p className="premium-header__rooms-section-title">Rooms</p>
                    <div className="premium-header__rooms-options-grid">
                      {ROOM_OPTIONS.map((option) => (
                        <button
                          key={option.value || 'any-rooms'}
                          type="button"
                          className={`premium-header__chip-btn ${roomsDraft === option.value ? 'is-selected' : ''}`}
                          onClick={() => setRoomsDraft(option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="premium-header__rooms-section">
                    <p className="premium-header__rooms-section-title">Bathrooms</p>
                    <div className="premium-header__rooms-options-grid premium-header__rooms-options-grid--baths">
                      {BATH_OPTIONS.map((option) => (
                        <button
                          key={option.value || 'any-baths'}
                          type="button"
                          className={`premium-header__chip-btn ${bathsDraft === option.value ? 'is-selected' : ''}`}
                          onClick={() => setBathsDraft(option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="premium-header__rooms-panel-actions">
                    <button
                      type="button"
                      className="premium-header__rooms-clear-btn"
                      onClick={() => {
                        setRoomsDraft('');
                        setBathsDraft('');
                        setRooms('');
                        setBaths('');
                        applySearch({ nextRooms: '', nextBaths: '' });
                      }}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="premium-header__rooms-done-btn"
                      onClick={() => {
                        setRooms(roomsDraft);
                        setBaths(bathsDraft);
                        applySearch({ nextRooms: roomsDraft, nextBaths: bathsDraft });
                        setRoomsBathsExpanded(false);
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
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
          <div
            className="premium-header__likes"
            aria-live="polite"
            aria-label={`Liked apartments ${likedCount}. Total heart clicks ${heartClickCount}.`}
          >
            <svg className="premium-header__likes-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 21s-6.6-4.5-9.1-8.2C.8 9.5 1.5 5.8 4.5 4c2.2-1.3 5-.7 6.7 1.2L12 6l.8-.8c1.8-1.9 4.5-2.4 6.7-1.2 3 1.8 3.7 5.5 1.6 8.8C18.6 16.5 12 21 12 21Z" />
            </svg>
            <div className="premium-header__likes-copy">
              <span>Liked {likedCount}</span>
              <span>Clicks {heartClickCount}</span>
            </div>
          </div>
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
