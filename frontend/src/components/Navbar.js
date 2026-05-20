import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import homeKeyWordmark from '../assets/H Logo Gemini_Generated_Image_8ckrj88ckrj88ckr.png';
import FilterMenu from './FilterMenu';
import { getInterestSummary } from '../utils/propertyInterest';
import { useAuth } from '../context/AuthContext';

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
const PROPERTY_CATEGORY_OPTIONS = ['apartments', 'houses'];
const FEATURE_FILTER_OPTIONS = [
  'elevator',
  'parking',
  'pets',
  'disabled-access',
  'renovated',
  'furnished',
  'mamad',
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
  if (!normalizedRooms && !normalizedBaths) return 'Bedrooms/Baths';
  const roomOption = ROOM_OPTIONS.find((option) => option.value === normalizedRooms);
  const bathOption = BATH_OPTIONS.find((option) => option.value === normalizedBaths);
  const summaryParts = [];
  if (roomOption) summaryParts.push(`${roomOption.label}BR`);
  if (bathOption) summaryParts.push(`${bathOption.label}BA`);
  return summaryParts.join(' / ');
};

const getUserFirstName = (user = null) => {
  if (!user || typeof user !== 'object') return '';
  const fullName = String(user.name || '').trim();
  if (fullName) return fullName.split(/\s+/)[0];
  const emailPrefix = String(user.email || '').split('@')[0].trim();
  if (!emailPrefix) return '';
  return emailPrefix
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)[0];
};

const parseSearchFromLocation = (search = '') => {
  const params = new URLSearchParams(search);
  const city = params.get('q') || '';
  const rooms = params.get('rooms') || '';
  const baths = params.get('baths') || '';
  const listingType = sanitizeListingType(params.get('type') || 'rental');
  const propertyCategory = params.get('propertyCategory') || '';
  const normalizedPropertyCategory = PROPERTY_CATEGORY_OPTIONS.includes(propertyCategory) ? propertyCategory : '';
  const rawFeatures = String(params.get('features') || '');
  const featureFilters = rawFeatures
    .split(',')
    .map((value) => String(value || '').trim().toLowerCase())
    .filter((value) => FEATURE_FILTER_OPTIONS.includes(value));
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
    propertyCategory: normalizedPropertyCategory,
    featureFilters,
    minPriceInput,
    maxPriceInput,
    likedOnly: params.get('liked') === '1',
  };
};

const buildSearchQuery = ({
  city,
  rooms,
  baths,
  listingType,
  propertyCategory,
  featureFilters,
  minPriceInput,
  maxPriceInput,
  likedOnly,
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
  const normalizedPropertyCategory = String(propertyCategory || '').trim().toLowerCase();
  if (PROPERTY_CATEGORY_OPTIONS.includes(normalizedPropertyCategory)) {
    params.set('propertyCategory', normalizedPropertyCategory);
  }
  const normalizedFeatureFilters = (Array.isArray(featureFilters) ? featureFilters : [])
    .map((value) => String(value || '').trim().toLowerCase())
    .filter((value) => FEATURE_FILTER_OPTIONS.includes(value));
  if (normalizedFeatureFilters.length > 0) {
    params.set('features', normalizedFeatureFilters.join(','));
  }
  if (Number(minPriceInput) > PRICE_SLIDER_MIN) params.set('minPrice', String(minPriceInput));
  if (Number(maxPriceInput) < PRICE_SLIDER_MAX) params.set('maxPrice', String(maxPriceInput));
  if (likedOnly) params.set('liked', '1');
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
};

const Navbar = () => {
  const history = useHistory();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const parsedFromLocation = useMemo(
    () => parseSearchFromLocation(location.search),
    [location.search]
  );
  const [city, setCity] = useState(parsedFromLocation.city);
  const [rooms, setRooms] = useState(parsedFromLocation.rooms);
  const [baths, setBaths] = useState(parsedFromLocation.baths);
  const [listingType, setListingType] = useState(parsedFromLocation.listingType);
  const [propertyCategory, setPropertyCategory] = useState(parsedFromLocation.propertyCategory);
  const [featureFilters, setFeatureFilters] = useState(parsedFromLocation.featureFilters);
  const [minPriceInput, setMinPriceInput] = useState(parsedFromLocation.minPriceInput);
  const [maxPriceInput, setMaxPriceInput] = useState(parsedFromLocation.maxPriceInput);
  const [isPriceDragging, setIsPriceDragging] = useState(false);
  const [activePriceHandle, setActivePriceHandle] = useState('');
  const [priceExpanded, setPriceExpanded] = useState(false);
  const [likedOnly, setLikedOnly] = useState(parsedFromLocation.likedOnly);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [roomsBathsExpanded, setRoomsBathsExpanded] = useState(false);
  const [roomsDraft, setRoomsDraft] = useState(parsedFromLocation.rooms);
  const [bathsDraft, setBathsDraft] = useState(parsedFromLocation.baths);
  const [interestVersion, setInterestVersion] = useState(0);
  const priceRef = useRef(null);
  const roomsBathsRef = useRef(null);
  const filtersRef = useRef(null);
  const filtersPanelRef = useRef(null);
  const minPriceDraftRef = useRef(parsedFromLocation.minPriceInput);
  const maxPriceDraftRef = useRef(parsedFromLocation.maxPriceInput);
  const priceSliderRange = PRICE_SLIDER_MAX - PRICE_SLIDER_MIN;
  const minSliderPercent = ((minPriceInput - PRICE_SLIDER_MIN) / priceSliderRange) * 100;
  const maxSliderPercent = ((maxPriceInput - PRICE_SLIDER_MIN) / priceSliderRange) * 100;

  useEffect(() => {
    setCity(parsedFromLocation.city);
    setRooms(parsedFromLocation.rooms);
    setBaths(parsedFromLocation.baths);
    setListingType(parsedFromLocation.listingType);
    setPropertyCategory(parsedFromLocation.propertyCategory);
    setFeatureFilters(parsedFromLocation.featureFilters);
    setMinPriceInput(parsedFromLocation.minPriceInput);
    setMaxPriceInput(parsedFromLocation.maxPriceInput);
    minPriceDraftRef.current = parsedFromLocation.minPriceInput;
    maxPriceDraftRef.current = parsedFromLocation.maxPriceInput;
    setIsPriceDragging(false);
    setActivePriceHandle('');
    setPriceExpanded(false);
    setLikedOnly(parsedFromLocation.likedOnly);
    setRoomsDraft(parsedFromLocation.rooms);
    setBathsDraft(parsedFromLocation.baths);
    setFiltersExpanded(false);
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
    if (!priceExpanded) return undefined;
    const handlePointerDown = (event) => {
      if (priceRef.current && !priceRef.current.contains(event.target)) {
        setPriceExpanded(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setPriceExpanded(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [priceExpanded]);

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

  useEffect(() => {
    if (!filtersExpanded) return undefined;
    const closeFiltersFromOutsideInteraction = (event) => {
      const eventTarget = event.target;
      const clickedFilterToggle = eventTarget && eventTarget.closest
        ? eventTarget.closest('#header-search-filter-toggle')
        : null;
      if (clickedFilterToggle) return;
      if (filtersPanelRef.current && filtersPanelRef.current.contains(eventTarget)) return;
      setFiltersExpanded(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setFiltersExpanded(false);
    };
    document.addEventListener('pointerdown', closeFiltersFromOutsideInteraction, true);
    document.addEventListener('click', closeFiltersFromOutsideInteraction, true);
    document.addEventListener('touchstart', closeFiltersFromOutsideInteraction, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', closeFiltersFromOutsideInteraction, true);
      document.removeEventListener('click', closeFiltersFromOutsideInteraction, true);
      document.removeEventListener('touchstart', closeFiltersFromOutsideInteraction, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [filtersExpanded]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.body.classList.toggle('mobile-filters-open', filtersExpanded);
    return () => {
      document.body.classList.remove('mobile-filters-open');
    };
  }, [filtersExpanded]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleOpenMobileFilters = () => {
      setPriceExpanded(false);
      setRoomsBathsExpanded(false);
      setFiltersExpanded(true);
    };
    window.addEventListener('homekey:open-mobile-filters', handleOpenMobileFilters);
    return () => {
      window.removeEventListener('homekey:open-mobile-filters', handleOpenMobileFilters);
    };
  }, []);

  const applySearch = ({
    nextCity = city,
    nextRooms = rooms,
    nextBaths = baths,
    nextListingType = listingType,
    nextPropertyCategory = propertyCategory,
    nextFeatureFilters = featureFilters,
    nextMinPriceInput = minPriceInput,
    nextMaxPriceInput = maxPriceInput,
    nextLikedOnly = likedOnly,
  } = {}) => {
    const nextSearch = buildSearchQuery({
      city: nextCity,
      rooms: nextRooms,
      baths: nextBaths,
      listingType: nextListingType,
      propertyCategory: nextPropertyCategory,
      featureFilters: nextFeatureFilters,
      minPriceInput: nextMinPriceInput,
      maxPriceInput: nextMaxPriceInput,
      likedOnly: nextLikedOnly,
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
    minPriceDraftRef.current = nextMinPriceInput;
  };

  const handleMaxPriceSliderChange = (event) => {
    const nextValue = clampPriceValue(event.target.value);
    const minAllowedMax = Math.min(PRICE_SLIDER_MAX, minPriceInput + PRICE_SLIDER_STEP);
    const nextMaxPriceInput = Math.max(nextValue, minAllowedMax);
    setMaxPriceInput(nextMaxPriceInput);
    maxPriceDraftRef.current = nextMaxPriceInput;
  };

  const handlePriceDragStart = (handle) => {
    setIsPriceDragging(true);
    setActivePriceHandle(handle);
  };

  const commitPriceSearch = () => {
    applySearch({
      nextMinPriceInput: minPriceDraftRef.current,
      nextMaxPriceInput: maxPriceDraftRef.current,
    });
  };

  const handlePriceInteractionEnd = () => {
    setIsPriceDragging(false);
    setActivePriceHandle('');
    commitPriceSearch();
  };

  const handleHeaderSearchSubmit = (event) => {
    event.preventDefault();
    applySearch();
    setPriceExpanded(false);
    setFiltersExpanded(false);
    setRoomsBathsExpanded(false);
  };

  const handleFilterMenuMinPriceChange = (rawValue) => {
    const normalizedRaw = String(rawValue || '').trim();
    const parsedValue = normalizedRaw === '' ? PRICE_SLIDER_MIN : clampPriceValue(normalizedRaw);
    const nextMinPriceInput = Math.min(parsedValue, maxPriceInput);
    setMinPriceInput(nextMinPriceInput);
    minPriceDraftRef.current = nextMinPriceInput;
    applySearch({ nextMinPriceInput });
  };

  const handleFilterMenuMaxPriceChange = (rawValue) => {
    const normalizedRaw = String(rawValue || '').trim();
    const parsedValue = normalizedRaw === '' ? PRICE_SLIDER_MAX : clampPriceValue(normalizedRaw);
    const nextMaxPriceInput = Math.max(parsedValue, minPriceInput);
    setMaxPriceInput(nextMaxPriceInput);
    maxPriceDraftRef.current = nextMaxPriceInput;
    applySearch({ nextMaxPriceInput });
  };

  const handleTogglePropertyCategory = (nextCategory) => {
    const normalizedCategory = String(nextCategory || '').trim().toLowerCase();
    if (!PROPERTY_CATEGORY_OPTIONS.includes(normalizedCategory)) return;
    const resolvedCategory = propertyCategory === normalizedCategory ? '' : normalizedCategory;
    setPropertyCategory(resolvedCategory);
    applySearch({ nextPropertyCategory: resolvedCategory });
  };

  const handleToggleFeatureFilter = (featureId) => {
    const normalizedFeature = String(featureId || '').trim().toLowerCase();
    if (!FEATURE_FILTER_OPTIONS.includes(normalizedFeature)) return;
    const nextFeatureFilters = featureFilters.includes(normalizedFeature)
      ? featureFilters.filter((value) => value !== normalizedFeature)
      : [...featureFilters, normalizedFeature];
    setFeatureFilters(nextFeatureFilters);
    applySearch({ nextFeatureFilters });
  };

  const handleClearAllFilters = () => {
    setPropertyCategory('');
    setFeatureFilters([]);
    setMinPriceInput(PRICE_SLIDER_MIN);
    setMaxPriceInput(PRICE_SLIDER_MAX);
    minPriceDraftRef.current = PRICE_SLIDER_MIN;
    maxPriceDraftRef.current = PRICE_SLIDER_MAX;
    setFiltersExpanded(false);
    applySearch({
      nextPropertyCategory: '',
      nextFeatureFilters: [],
      nextMinPriceInput: PRICE_SLIDER_MIN,
      nextMaxPriceInput: PRICE_SLIDER_MAX,
    });
  };

  const hasCustomPrice = minPriceInput > PRICE_SLIDER_MIN || maxPriceInput < PRICE_SLIDER_MAX;
  const roomsBathsSummaryLabel = getRoomsBathsSummaryLabel(rooms, baths);
  const interestSummary = useMemo(() => getInterestSummary(), [interestVersion]);
  const likedCount = (interestSummary.favoriteIds || []).length;
  const userFirstName = getUserFirstName(user);
  const shouldShowGreeting = isAuthenticated && Boolean(userFirstName);

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
            <div className="premium-header__search-pill" role="group" aria-label="Property search">
              <div className="premium-header__search-segment premium-header__search-segment--location">
                <input
                  id="header-search-query"
                  type="text"
                  placeholder="Search city, neighborhood or listing"
                  className={city.trim() ? 'is-active' : ''}
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  onBlur={(event) => applySearch({ nextCity: event.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="premium-header__search-segment premium-header__search-segment--price" ref={priceRef}>
                <button
                  id="header-search-price-toggle"
                  type="button"
                  className={`premium-header__price-toggle ${hasCustomPrice ? 'is-active' : ''}`}
                  aria-live="polite"
                  aria-expanded={priceExpanded}
                  aria-controls="header-price-slider-panel"
                  onClick={() => {
                    setRoomsBathsExpanded(false);
                    setFiltersExpanded(false);
                    setPriceExpanded((isExpanded) => !isExpanded);
                  }}
                >
                  <span>Price</span>
                </button>
                <div
                  id="header-price-slider-panel"
                  className={`premium-header__price-panel ${priceExpanded ? 'is-open' : ''}`}
                >
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
                      onMouseDown={() => handlePriceDragStart('min')}
                      onTouchStart={() => handlePriceDragStart('min')}
                      onMouseUp={handlePriceInteractionEnd}
                      onTouchEnd={handlePriceInteractionEnd}
                      onTouchCancel={handlePriceInteractionEnd}
                      onKeyUp={handlePriceInteractionEnd}
                      onBlur={handlePriceInteractionEnd}
                      className={`premium-header__price-slider premium-header__price-slider--min ${activePriceHandle === 'min' ? 'is-active' : ''}`}
                      aria-label="Minimum price"
                    />
                    <input
                      type="range"
                      min={PRICE_SLIDER_MIN}
                      max={PRICE_SLIDER_MAX}
                      step={PRICE_SLIDER_STEP}
                      value={maxPriceInput}
                      onChange={handleMaxPriceSliderChange}
                      onMouseDown={() => handlePriceDragStart('max')}
                      onTouchStart={() => handlePriceDragStart('max')}
                      onMouseUp={handlePriceInteractionEnd}
                      onTouchEnd={handlePriceInteractionEnd}
                      onTouchCancel={handlePriceInteractionEnd}
                      onKeyUp={handlePriceInteractionEnd}
                      onBlur={handlePriceInteractionEnd}
                      className={`premium-header__price-slider premium-header__price-slider--max ${activePriceHandle === 'max' ? 'is-active' : ''}`}
                      aria-label="Maximum price"
                    />
                  </div>
                </div>
              </div>
              <div className="premium-header__search-segment premium-header__search-segment--rooms" ref={roomsBathsRef}>
                <button
                  id="header-search-rooms-toggle"
                  type="button"
                  className={`premium-header__rooms-toggle ${rooms || baths ? 'is-active' : ''}`}
                  onClick={() => {
                    setPriceExpanded(false);
                    setFiltersExpanded(false);
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
                </button>
                <div
                  id="header-rooms-baths-panel"
                  className={`premium-header__rooms-panel ${roomsBathsExpanded ? 'is-open' : ''}`}
                >
                  <div className="premium-header__rooms-section">
                    <p className="premium-header__rooms-section-title">Bedrooms</p>
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
                      Clear All Selections
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
              <div className="premium-header__search-segment premium-header__search-segment--all-filters" ref={filtersRef}>
                <button
                  id="header-search-filter-toggle"
                  type="button"
                  className={`premium-header__filters-toggle ${propertyCategory || featureFilters.length > 0 ? 'is-active' : ''}`}
                  onClick={() => {
                    setPriceExpanded(false);
                    setRoomsBathsExpanded(false);
                    setFiltersExpanded((value) => !value);
                  }}
                  aria-expanded={filtersExpanded}
                  aria-controls="header-filters-panel"
                >
                  <span>All Filters</span>
                </button>
                <div
                  id="header-filters-panel"
                  ref={filtersPanelRef}
                  className={`premium-header__filters-panel ${filtersExpanded ? 'is-open' : ''} is-mobile-sheet`}
                >
                  <FilterMenu
                    onClearAllFilters={handleClearAllFilters}
                    minPrice={minPriceInput}
                    maxPrice={maxPriceInput}
                    propertyCategory={propertyCategory}
                    selectedFeatures={featureFilters}
                    onMinPriceChange={handleFilterMenuMinPriceChange}
                    onMaxPriceChange={handleFilterMenuMaxPriceChange}
                    onTogglePropertyCategory={handleTogglePropertyCategory}
                    onToggleFeature={handleToggleFeatureFilter}
                  />
                  <button
                    type="button"
                    className="mobile-filter-sheet-close-btn"
                    onClick={() => setFiltersExpanded(false)}
                  >
                    Show Results
                  </button>
                </div>
                {filtersExpanded && (
                  <button
                    type="button"
                    className="mobile-filter-sheet-backdrop is-visible"
                    aria-label="Close filters panel backdrop"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setFiltersExpanded(false);
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setFiltersExpanded(false);
                    }}
                  />
                )}
              </div>
            </div>
            <button type="submit" className="premium-header__search-submit" aria-label="Apply search">Search</button>
          </form>
        </div>

        <div className="premium-header__likes-cell">
          <button
            type="button"
            className={`premium-header__likes ${likedOnly ? 'is-active' : ''}`}
            onClick={() => {
              const nextLikedOnly = !likedOnly;
              setLikedOnly(nextLikedOnly);
              applySearch({ nextLikedOnly });
            }}
            aria-live="polite"
            aria-label={`Liked apartments ${likedCount}. ${likedOnly ? 'Showing only liked apartments.' : 'Showing all apartments.'}`}
            aria-pressed={likedOnly}
          >
            <span className={`premium-header__likes-heart ${likedOnly ? 'is-active' : ''}`} aria-hidden="true">
              <span className="property-heart-icon-wrap">
                <svg className="property-heart-icon" viewBox="0 0 24 24" focusable="false">
                  <path d="M12 21s-6.6-4.5-9.1-8.2C.8 9.5 1.5 5.8 4.5 4c2.2-1.3 5-.7 6.7 1.2L12 6l.8-.8c1.8-1.9 4.5-2.4 6.7-1.2 3 1.8 3.7 5.5 1.6 8.8C18.6 16.5 12 21 12 21Z" />
                </svg>
              </span>
            </span>
            <div className="premium-header__likes-copy">
              <span>Liked {likedCount}</span>
            </div>
          </button>
        </div>

        <div className="premium-header__actions premium-header__actions-cell">
          <button className="premium-header__language-toggle" type="button" aria-label="Toggle language">
            <span className="premium-header__flag-icon" aria-hidden="true">
              <span className="premium-header__flag-star">✡</span>
            </span>
            <span className="premium-header__language-text">He</span>
          </button>
          <Link to="/add-listing" className="premium-header__cta">List a Property</Link>
          {isAuthenticated && <Link to="/alerts" className="premium-header__alerts-link">Instant Alerts</Link>}
          {shouldShowGreeting ? (
            <div className="premium-header__greeting" aria-label={`Hello ${userFirstName}`}>
              <span className="premium-header__greeting-label">Hello</span>
              <span className="premium-header__greeting-name">{userFirstName}</span>
            </div>
          ) : (
            <Link to="/login" className="premium-header__login">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
