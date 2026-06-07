import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import hKeyholeLogo from '../assets/h-letter-logo-transparent-fixed.png';
import FilterMenu from './FilterMenu';
import ISRAEL_LOCATIONS from '../israelLocations';
import { getInterestSummary } from '../utils/propertyInterest';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { interpretSearchPrompt } from '../services/api';

const PRICE_SLIDER_MIN = 0;
const PRICE_SLIDER_MAX = 20000;
const PRICE_SLIDER_STEP = 500;
const ROOM_OPTION_VALUES = ['', 'studio', '1', '2', '3', '4+'];
const BATH_OPTION_VALUES = ['', '1', '2', '3+'];
const LISTING_TYPE_OPTIONS = ['rental', 'sale'];
const PROPERTY_CATEGORY_OPTIONS = ['apartments', 'houses'];
const FEATURE_FILTER_OPTIONS = [
  'elevator', 'parking', 'pets', 'disabled-access', 'renovated', 'furnished',
  'mamad', 'oven', 'balcony', 'stovetop', 'laundry-facilities', 'in-unit-washer-dryer',
];
const AI_LISTING_TYPE_KEYWORDS = {
  roommates: ['roommate', 'roommates', 'shared apartment', 'shared flat'],
  rental: ['rent', 'rental', 'lease'],
  sale: ['buy', 'sale', 'purchase'],
};
const AI_PROPERTY_CATEGORY_KEYWORDS = {
  apartments: ['apartment', 'studio', 'condo', 'flat', 'penthouse'],
  houses: ['house', 'home', 'villa', 'duplex', 'townhouse'],
};
const AI_FEATURE_KEYWORDS = {
  elevator: ['elevator', 'lift'],
  parking: ['parking', 'garage', 'carport'],
  pets: ['pet', 'pets', 'dog', 'cat'],
  'disabled-access': ['accessible', 'wheelchair', 'disabled'],
  renovated: ['renovated', 'refurbished'],
  furnished: ['furnished'],
  mamad: ['mamad', 'safe room', 'security room'],
  oven: ['oven'],
  balcony: ['balcony', 'terrace', 'mirpeset'],
  stovetop: ['stovetop', 'cooktop', 'hob'],
  'laundry-facilities': ['laundry', 'laundry facilities', 'laundry room'],
  'in-unit-washer-dryer': ['in-unit washer', 'in unit washer', 'washer dryer', 'washer & dryer', 'washer and dryer'],
};
const getSpeechRecognitionConstructor = () => {
  if (typeof window === 'undefined') return null;
  const recognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  return typeof recognitionConstructor === 'function' ? recognitionConstructor : null;
};
const SAVE_SEARCH_AFTER_AUTH_SESSION_KEY = 'homekey:save-search-after-auth';
const RECENT_SEARCHES_KEY = 'homekey:recent-searches';
const MAX_RECENT_SEARCHES = 5;

// ── Recent searches helpers ──
const getRecentSearches = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveRecentSearch = (term) => {
  if (typeof window === 'undefined' || !term.trim()) return;
  try {
    const existing = getRecentSearches().filter(s => s !== term.trim());
    const updated = [term.trim(), ...existing].slice(0, MAX_RECENT_SEARCHES);
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
};

// ── Location autocomplete logic ──
const buildLocationSuggestions = (query, language) => {
  const q = query.trim().toLowerCase();
  if (!q) return { cities: [], neighborhoods: [] };

  const cities = [];
  const neighborhoods = [];

  ISRAEL_LOCATIONS.forEach(({ city, neighborhoods: hoods }) => {
    const cityEn = city.en.toLowerCase();
    const cityHe = city.he;
    const cityMatches = cityEn.includes(q) || cityHe.includes(q);

    if (cityMatches) {
      cities.push({ label: language === 'he' ? city.he : city.en, value: city.en });
    }

    hoods.forEach((hood) => {
      const hoodEn = hood.en.toLowerCase();
      const hoodHe = hood.he;
      if (hoodEn.includes(q) || hoodHe.includes(q)) {
        neighborhoods.push({
          label: language === 'he' ? `${hood.he}, ${city.he}` : `${hood.en}, ${city.en}`,
          value: `${hood.en}, ${city.en}`,
          cityValue: city.en,
        });
      }
    });
  });

  return { cities: cities.slice(0, 5), neighborhoods: neighborhoods.slice(0, 5) };
};

const clampPriceValue = (value) => {
  const asNumber = Number(value);
  if (Number.isNaN(asNumber)) return PRICE_SLIDER_MIN;
  return Math.min(PRICE_SLIDER_MAX, Math.max(PRICE_SLIDER_MIN, asNumber));
};

const formatPriceSliderLabel = (value, isUpper = false, locale = 'en-US') => {
  const normalized = clampPriceValue(value);
  if (isUpper && normalized >= PRICE_SLIDER_MAX) return `₪ ${normalized.toLocaleString(locale)}+`;
  return `₪ ${normalized.toLocaleString(locale)}`;
};

const sanitizeListingType = (rawValue) => {
  const normalized = String(rawValue || '').toLowerCase();
  if (['rental', 'sale', 'roommates'].includes(normalized)) return normalized;
  return 'all';
};

const includesAnyKeyword = (searchText = '', keywords = []) =>
  keywords.some((keyword) => searchText.includes(keyword));

const normalizeRoomCount = (value) => {
  if (value == null || String(value).trim() === '') return '';
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return '';
  if (parsed >= 4) return '4+';
  return String(parsed);
};

const normalizeBathCount = (value) => {
  if (value == null || String(value).trim() === '') return '';
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return '';
  if (parsed >= 3) return '3+';
  return String(parsed);
};

const parseAiBudgetToken = (rawToken = '') => {
  const normalized = String(rawToken || '').trim().toLowerCase().replace(/[$₪,\s]/g, '');
  if (!normalized) return null;
  const isKAmount = normalized.endsWith('k');
  const numericPart = isKAmount ? normalized.slice(0, -1) : normalized;
  const parsed = Number(numericPart);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * (isKAmount ? 1000 : 1));
};

const parseAiPriceRange = (rawInput = '') => {
  const normalized = String(rawInput || '').toLowerCase();
  let minPriceInput = PRICE_SLIDER_MIN;
  let maxPriceInput = PRICE_SLIDER_MAX;
  const betweenMatch = normalized.match(/(?:between|from)\s*[$₪]?\s*([\d.,k]+)\s*(?:and|to|-)\s*[$₪]?\s*([\d.,k]+)/);
  if (betweenMatch) {
    const firstValue = parseAiBudgetToken(betweenMatch[1]);
    const secondValue = parseAiBudgetToken(betweenMatch[2]);
    if (firstValue != null && secondValue != null) {
      minPriceInput = clampPriceValue(Math.min(firstValue, secondValue));
      maxPriceInput = clampPriceValue(Math.max(firstValue, secondValue));
      return { minPriceInput, maxPriceInput };
    }
  }
  const maxMatch = normalized.match(/(?:under|below|max(?:imum)?|up to|less than)\s*[$₪]?\s*([\d.,k]+)/);
  if (maxMatch) { const parsedMax = parseAiBudgetToken(maxMatch[1]); if (parsedMax != null) maxPriceInput = clampPriceValue(parsedMax); }
  const minMatch = normalized.match(/(?:over|above|min(?:imum)?|starting at|at least)\s*[$₪]?\s*([\d.,k]+)/);
  if (minMatch) { const parsedMin = parseAiBudgetToken(minMatch[1]); if (parsedMin != null) minPriceInput = clampPriceValue(parsedMin); }
  if (minPriceInput > maxPriceInput) {
    const midpoint = Math.round((minPriceInput + maxPriceInput) / 2 / PRICE_SLIDER_STEP) * PRICE_SLIDER_STEP;
    return { minPriceInput: midpoint, maxPriceInput: midpoint };
  }
  return { minPriceInput, maxPriceInput };
};

const extractAiCityCandidate = (rawInput = '') => {
  const strippedText = String(rawInput || '')
    .replace(/[$₪]/g, ' ')
    .replace(/\b(\d+[.,]?\d*k?|studio|bed(?:room)?s?|br|bath(?:room)?s?|ba|rent|rental|lease|roommate|roommates|shared apartment|shared flat|buy|sale|purchase|house|home|apartment|flat|condo|villa|duplex|townhouse|parking|garage|carport|elevator|lift|pet(?:s)?|dog|cat|accessible|wheelchair|disabled|renovated|refurbished|furnished|mamad|safe room|security room|oven|balcony|terrace|mirpeset|stovetop|cooktop|hob|laundry|laundry facilities|laundry room|in-unit washer|in unit washer|washer dryer|washer\s*(?:&|and)\s*dryer|under|below|max(?:imum)?|up to|less than|over|above|min(?:imum)?|starting at|at least|between|from|to|and|with|in|near|around|at)\b/gi, ' ')
    .replace(/[^a-zA-Z\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!strippedText) return '';
  return strippedText.split(/\s+/).slice(0, 4).join(' ').trim();
};

const parseAiSearchInput = (rawInput = '') => {
  const trimmedInput = String(rawInput || '').trim();
  const normalized = trimmedInput.toLowerCase();
  let listingType = 'all';
  if (includesAnyKeyword(normalized, AI_LISTING_TYPE_KEYWORDS.roommates)) listingType = 'roommates';
  else if (includesAnyKeyword(normalized, AI_LISTING_TYPE_KEYWORDS.rental)) listingType = 'rental';
  else if (includesAnyKeyword(normalized, AI_LISTING_TYPE_KEYWORDS.sale)) listingType = 'sale';
  let propertyCategory = '';
  if (includesAnyKeyword(normalized, AI_PROPERTY_CATEGORY_KEYWORDS.apartments)) propertyCategory = 'apartments';
  else if (includesAnyKeyword(normalized, AI_PROPERTY_CATEGORY_KEYWORDS.houses)) propertyCategory = 'houses';
  const featureFilters = FEATURE_FILTER_OPTIONS.filter((featureId) => includesAnyKeyword(normalized, AI_FEATURE_KEYWORDS[featureId] || []));
  let rooms = '';
  if (/\bstudio\b/i.test(normalized)) rooms = 'studio';
  else {
    const roomPlusMatch = normalized.match(/(\d+)\s*\+\s*(?:bed|br|bedroom)/i);
    const roomMatch = normalized.match(/(\d+)\s*(?:bed|br|bedroom)s?\b/i);
    rooms = normalizeRoomCount((roomPlusMatch && roomPlusMatch[1]) || (roomMatch && roomMatch[1]) || '');
  }
  const bathPlusMatch = normalized.match(/(\d+)\s*\+\s*(?:bath|ba|bathroom)/i);
  const bathMatch = normalized.match(/(\d+)\s*(?:bath|ba|bathroom)s?\b/i);
  const baths = normalizeBathCount((bathPlusMatch && bathPlusMatch[1]) || (bathMatch && bathMatch[1]) || '');
  const { minPriceInput, maxPriceInput } = parseAiPriceRange(normalized);
  const extractedCity = extractAiCityCandidate(trimmedInput);
  const city = extractedCity || trimmedInput;
  return { city, rooms, baths, listingType, propertyCategory, featureFilters, minPriceInput, maxPriceInput };
};

const normalizeInterpretedSearch = (rawFilters = {}, fallbackPrompt = '') => {
  const filters = rawFilters && typeof rawFilters === 'object' ? rawFilters : {};
  const minRaw = filters.minPrice;
  const maxRaw = filters.maxPrice;
  let minPriceInput = minRaw == null || minRaw === '' ? PRICE_SLIDER_MIN : clampPriceValue(minRaw);
  let maxPriceInput = maxRaw == null || maxRaw === '' ? PRICE_SLIDER_MAX : clampPriceValue(maxRaw);
  if (minPriceInput > maxPriceInput) {
    const midpoint = Math.round((minPriceInput + maxPriceInput) / 2 / PRICE_SLIDER_STEP) * PRICE_SLIDER_STEP;
    minPriceInput = midpoint; maxPriceInput = midpoint;
  }
  const normalizedPropertyCategory = String(filters.propertyCategory || '').trim().toLowerCase();
  const featureFilters = (Array.isArray(filters.features) ? filters.features : [])
    .map((value) => String(value || '').trim().toLowerCase())
    .filter((value, index, values) => FEATURE_FILTER_OPTIONS.includes(value) && values.indexOf(value) === index);
  return {
    city: String(filters.q || filters.city || fallbackPrompt || '').trim(),
    rooms: ROOM_OPTION_VALUES.includes(String(filters.rooms || '').trim()) ? String(filters.rooms || '').trim() : '',
    baths: BATH_OPTION_VALUES.includes(String(filters.baths || '').trim()) ? String(filters.baths || '').trim() : '',
    listingType: sanitizeListingType(filters.type || 'all'),
    propertyCategory: PROPERTY_CATEGORY_OPTIONS.includes(normalizedPropertyCategory) ? normalizedPropertyCategory : '',
    featureFilters, minPriceInput, maxPriceInput,
  };
};

const getRoomsBathsSummaryLabel = ({ rooms = '', baths = '', roomOptions = [], bathOptions = [], t }) => {
  const normalizedRooms = String(rooms || '').trim();
  const normalizedBaths = String(baths || '').trim();
  if (!normalizedRooms && !normalizedBaths) return t('navbar.roomsBathsDefault');
  const roomOption = roomOptions.find((option) => option.value === normalizedRooms);
  const bathOption = bathOptions.find((option) => option.value === normalizedBaths);
  const summaryParts = [];
  if (roomOption) summaryParts.push(`${roomOption.label} ${t('navbar.roomSummarySuffix')}`);
  if (bathOption) summaryParts.push(`${bathOption.label} ${t('navbar.bathSummarySuffix')}`);
  return summaryParts.join(' / ');
};

const getUserFirstName = (user = null) => {
  if (!user || typeof user !== 'object') return '';
  const fullName = String(user.name || '').trim();
  if (fullName) return fullName.split(/\s+/)[0];
  const emailPrefix = String(user.email || '').split('@')[0].trim();
  if (!emailPrefix) return '';
  return emailPrefix.replace(/[._-]+/g, ' ').trim().split(/\s+/)[0];
};

const HeaderIcon = ({ name }) => {
  const iconProps = {
    className: 'premium-header__icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    focusable: 'false',
    'aria-hidden': 'true',
  };
  const paths = {
    location: (<><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" /><circle cx="12" cy="10" r="2.1" /></>),
    price: (<><path d="M6 7h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" /><path d="M8 12h.01M16 12h.01" /><circle cx="12" cy="12" r="2.2" /></>),
    bed: (<><path d="M4 11V6.8A1.8 1.8 0 0 1 5.8 5h4.4A1.8 1.8 0 0 1 12 6.8V11" /><path d="M12 11V7.8A1.8 1.8 0 0 1 13.8 6h4.4A1.8 1.8 0 0 1 20 7.8V11" /><path d="M3 19v-5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v5" /><path d="M3 16h18" /></>),
    building: (<><path d="M5 21V5a2 2 0 0 1 2-2h7v18" /><path d="M14 8h3a2 2 0 0 1 2 2v11" /><path d="M8 7h2M8 11h2M8 15h2M16 12h1M16 16h1M4 21h17" /></>),
    filters: (<><path d="M4 7h16M4 12h16M4 17h16" /><circle cx="8" cy="7" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="11" cy="17" r="1.6" /></>),
    user: (<><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>),
    roommates: (<><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="8" r="2.5" /><path d="M14 20c0-2.8 1.8-5 4-5.5" /></>),
    clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>),
  };
  return <svg {...iconProps}>{paths[name]}</svg>;
};

const parseSearchFromLocation = (search = '') => {
  const params = new URLSearchParams(search);
  const city = params.get('q') || '';
  const rooms = params.get('rooms') || '';
  const baths = params.get('baths') || '';
  const listingType = sanitizeListingType(params.get('type') || 'all');
  const propertyCategory = params.get('propertyCategory') || '';
  const normalizedPropertyCategory = PROPERTY_CATEGORY_OPTIONS.includes(propertyCategory) ? propertyCategory : '';
  const rawFeatures = String(params.get('features') || '');
  const featureFilters = rawFeatures.split(',').map((value) => String(value || '').trim().toLowerCase()).filter((value) => FEATURE_FILTER_OPTIONS.includes(value));
  const minRaw = params.get('minPrice');
  const maxRaw = params.get('maxPrice');
  const hasMin = minRaw != null && minRaw !== '';
  const hasMax = maxRaw != null && maxRaw !== '';
  let minPriceInput = hasMin ? clampPriceValue(minRaw) : PRICE_SLIDER_MIN;
  let maxPriceInput = hasMax ? clampPriceValue(maxRaw) : PRICE_SLIDER_MAX;
  if (minPriceInput > maxPriceInput) {
    const midpoint = Math.round((minPriceInput + maxPriceInput) / 2 / PRICE_SLIDER_STEP) * PRICE_SLIDER_STEP;
    minPriceInput = midpoint; maxPriceInput = midpoint;
  }
  return { city, rooms, baths, listingType, propertyCategory: normalizedPropertyCategory, featureFilters, minPriceInput, maxPriceInput, likedOnly: params.get('liked') === '1' };
};

const buildSearchQuery = ({ city, rooms, baths, listingType, propertyCategory, featureFilters, minPriceInput, maxPriceInput, likedOnly }) => {
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
  if (PROPERTY_CATEGORY_OPTIONS.includes(normalizedPropertyCategory)) params.set('propertyCategory', normalizedPropertyCategory);
  const normalizedFeatureFilters = (Array.isArray(featureFilters) ? featureFilters : []).map((value) => String(value || '').trim().toLowerCase()).filter((value) => FEATURE_FILTER_OPTIONS.includes(value));
  if (normalizedFeatureFilters.length > 0) params.set('features', normalizedFeatureFilters.join(','));
  if (Number(minPriceInput) > PRICE_SLIDER_MIN) params.set('minPrice', String(minPriceInput));
  if (Number(maxPriceInput) < PRICE_SLIDER_MAX) params.set('maxPrice', String(maxPriceInput));
  if (likedOnly) params.set('liked', '1');
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
};

// ── Location Autocomplete Dropdown Component ──
const LocationAutocomplete = ({
  value,
  onChange,
  onSelect = () => {},
  onBlur = () => {},
  placeholder,
  language,
  isHebrew,
  inputId = 'header-search-query',
  wrapperClassName = '',
  inputClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState({ cities: [], neighborhoods: [] });
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const suppressNextOpenRef = useRef(false);
  const wrapperClassNames = ['location-autocomplete', wrapperClassName].filter(Boolean).join(' ');
  const resolvedInputClassName = inputClassName || (value.trim() ? 'is-active' : '');

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    if (value.trim().length > 0) {
      setSuggestions(buildLocationSuggestions(value, language));
      if (suppressNextOpenRef.current) {
        suppressNextOpenRef.current = false;
        setIsOpen(false);
        return;
      }
      setIsOpen(true);
    } else {
      setSuggestions({ cities: [], neighborhoods: [] });
    }
  }, [value, language]);

  const allSuggestions = useMemo(() => {
    const items = [];
    if (suggestions.cities.length > 0) {
      items.push({ type: 'header', label: isHebrew ? 'ערים' : 'CITIES' });
      suggestions.cities.forEach(s => items.push({ type: 'city', ...s }));
    }
    if (suggestions.neighborhoods.length > 0) {
      items.push({ type: 'header', label: isHebrew ? 'שכונות' : 'NEIGHBORHOODS' });
      suggestions.neighborhoods.forEach(s => items.push({ type: 'neighborhood', ...s }));
    }
    return items;
  }, [suggestions, isHebrew]);

  const selectableItems = allSuggestions.filter(s => s.type !== 'header');

  const handleSelect = useCallback((item) => {
    const val = item.value;
    suppressNextOpenRef.current = true;
    onChange(val);
    onSelect(val);
    saveRecentSearch(val);
    setRecentSearches(getRecentSearches());
    setIsOpen(false);
    setActiveIndex(-1);
  }, [onChange, onSelect]);

  const handleRecentSelect = useCallback((term) => {
    suppressNextOpenRef.current = true;
    onChange(term);
    onSelect(term);
    setIsOpen(false);
  }, [onChange, onSelect]);

  const handleKeyDown = (e) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, selectableItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(selectableItems[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const showDropdown = isOpen && (allSuggestions.length > 0 || (value.trim() === '' && recentSearches.length > 0));
  const showRecent = value.trim() === '' && recentSearches.length > 0;

  return (
    <div className={wrapperClassNames} ref={dropdownRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        placeholder={placeholder}
        className={resolvedInputClassName}
        value={value}
        onChange={(e) => {
          suppressNextOpenRef.current = false;
          onChange(e.target.value);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={(e) => {
          setTimeout(() => setIsOpen(false), 150);
          onBlur(e);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {showDropdown && (
        <div className="location-autocomplete__dropdown">
          {showRecent && (
            <>
              <div className="location-autocomplete__section-header">
                {isHebrew ? 'חיפושים אחרונים' : 'RECENT SEARCHES'}
              </div>
              {recentSearches.map((term, i) => (
                <button
                  key={`recent-${i}`}
                  type="button"
                  className="location-autocomplete__item location-autocomplete__item--recent"
                  onPointerDown={(e) => { e.preventDefault(); handleRecentSelect(term); }}
                >
                  <span className="location-autocomplete__item-icon">
                    <HeaderIcon name="clock" />
                  </span>
                  <span>{term}</span>
                </button>
              ))}
            </>
          )}
          {allSuggestions.map((item, i) => {
            if (item.type === 'header') {
              return (
                <div key={`header-${i}`} className="location-autocomplete__section-header">
                  {item.label}
                </div>
              );
            }
            const selectableIndex = selectableItems.indexOf(item);
            const isActive = selectableIndex === activeIndex;
            return (
              <button
                key={`suggestion-${i}`}
                type="button"
                className={`location-autocomplete__item ${isActive ? 'is-active' : ''}`}
                onPointerDown={(e) => { e.preventDefault(); handleSelect(item); }}
              >
                <span className="location-autocomplete__item-icon">
                  <HeaderIcon name="location" />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Navbar = () => {
  const history = useHistory();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { language, locale, toggleLanguage, t } = useLanguage();
  const parsedFromLocation = useMemo(() => parseSearchFromLocation(location.search), [location.search]);
  const [city, setCity] = useState(parsedFromLocation.city);
  const [rooms, setRooms] = useState(parsedFromLocation.rooms);
  const [baths, setBaths] = useState(parsedFromLocation.baths);
  const [listingType, setListingType] = useState(parsedFromLocation.listingType);
  const [propertyCategory, setPropertyCategory] = useState(parsedFromLocation.propertyCategory);
  const [featureFilters, setFeatureFilters] = useState(parsedFromLocation.featureFilters);
  const [roommateLocationDraft, setRoommateLocationDraft] = useState(parsedFromLocation.city);
  const [minPriceInput, setMinPriceInput] = useState(parsedFromLocation.minPriceInput);
  const [maxPriceInput, setMaxPriceInput] = useState(parsedFromLocation.maxPriceInput);
  const [isPriceDragging, setIsPriceDragging] = useState(false);
  const [activePriceHandle, setActivePriceHandle] = useState('');
  const [priceExpanded, setPriceExpanded] = useState(false);
  const [likedOnly, setLikedOnly] = useState(parsedFromLocation.likedOnly);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [roomsBathsExpanded, setRoomsBathsExpanded] = useState(false);
  const [propertyTypeExpanded, setPropertyTypeExpanded] = useState(false);
  const [roomsDraft, setRoomsDraft] = useState(parsedFromLocation.rooms);
  const [bathsDraft, setBathsDraft] = useState(parsedFromLocation.baths);
  const [interestVersion, setInterestVersion] = useState(0);
  const [, setIsSavingSearch] = useState(false);
  const [, setSaveSearchStatus] = useState('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceSearchStatus, setVoiceSearchStatus] = useState('');
  const [isAiSearchInterpreting, setIsAiSearchInterpreting] = useState(false);
  const priceRef = useRef(null);
  const roomsBathsRef = useRef(null);
  const propertyTypeRef = useRef(null);
  const filtersRef = useRef(null);
  const filtersPanelRef = useRef(null);
  const minPriceDraftRef = useRef(parsedFromLocation.minPriceInput);
  const maxPriceDraftRef = useRef(parsedFromLocation.maxPriceInput);
  const saveSearchFeedbackTimerRef = useRef(null);
  const deferredAutoSaveTimerRef = useRef(null);
  const voiceStatusTimerRef = useRef(null);
  const voiceRecognitionRef = useRef(null);
  const keepFilterSheetOpenRef = useRef(false);
  const priceSliderRange = PRICE_SLIDER_MAX - PRICE_SLIDER_MIN;
  const minSliderPercent = ((minPriceInput - PRICE_SLIDER_MIN) / priceSliderRange) * 100;
  const maxSliderPercent = ((maxPriceInput - PRICE_SLIDER_MIN) / priceSliderRange) * 100;
  const isHebrew = language === 'he';

  useEffect(() => {
    setCity(parsedFromLocation.city);
    setRooms(parsedFromLocation.rooms);
    setBaths(parsedFromLocation.baths);
    setListingType(parsedFromLocation.listingType);
    setPropertyCategory(parsedFromLocation.propertyCategory);
    setFeatureFilters(parsedFromLocation.featureFilters);
    setRoommateLocationDraft(parsedFromLocation.city);
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
    const keepFilterSheetOpen = keepFilterSheetOpenRef.current;
    keepFilterSheetOpenRef.current = false;
    setFiltersExpanded((currentValue) => (keepFilterSheetOpen ? currentValue : false));
    setRoomsBathsExpanded(false);
    setPropertyTypeExpanded(false);
  }, [parsedFromLocation]);

  useEffect(() => () => {
    if (saveSearchFeedbackTimerRef.current) { window.clearTimeout(saveSearchFeedbackTimerRef.current); saveSearchFeedbackTimerRef.current = null; }
    if (deferredAutoSaveTimerRef.current) { window.clearTimeout(deferredAutoSaveTimerRef.current); deferredAutoSaveTimerRef.current = null; }
    if (voiceStatusTimerRef.current) { window.clearTimeout(voiceStatusTimerRef.current); voiceStatusTimerRef.current = null; }
    if (voiceRecognitionRef.current) { try { voiceRecognitionRef.current.stop(); } catch (_err) {} voiceRecognitionRef.current = null; }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleSaveSearchResult = (event) => {
      const success = Boolean(event?.detail?.success);
      setIsSavingSearch(false);
      setSaveSearchStatus(success ? 'saved' : 'failed');
      if (saveSearchFeedbackTimerRef.current) window.clearTimeout(saveSearchFeedbackTimerRef.current);
      saveSearchFeedbackTimerRef.current = window.setTimeout(() => { setSaveSearchStatus(''); saveSearchFeedbackTimerRef.current = null; }, success ? 2800 : 3200);
    };
    window.addEventListener('homekey:save-current-search-result', handleSaveSearchResult);
    return () => window.removeEventListener('homekey:save-current-search-result', handleSaveSearchResult);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleInterestUpdated = () => setInterestVersion((value) => value + 1);
    window.addEventListener('homekey:interest-updated', handleInterestUpdated);
    return () => window.removeEventListener('homekey:interest-updated', handleInterestUpdated);
  }, []);

  useEffect(() => {
    if (!priceExpanded) return undefined;
    const handlePointerDown = (event) => { if (priceRef.current && !priceRef.current.contains(event.target)) setPriceExpanded(false); };
    const handleKeyDown = (event) => { if (event.key === 'Escape') setPriceExpanded(false); };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('mousedown', handlePointerDown); document.removeEventListener('touchstart', handlePointerDown); document.removeEventListener('keydown', handleKeyDown); };
  }, [priceExpanded]);

  useEffect(() => {
    if (!roomsBathsExpanded) return undefined;
    const handlePointerDown = (event) => { if (roomsBathsRef.current && !roomsBathsRef.current.contains(event.target)) setRoomsBathsExpanded(false); };
    const handleKeyDown = (event) => { if (event.key === 'Escape') setRoomsBathsExpanded(false); };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('mousedown', handlePointerDown); document.removeEventListener('touchstart', handlePointerDown); document.removeEventListener('keydown', handleKeyDown); };
  }, [roomsBathsExpanded]);

  useEffect(() => {
    if (!propertyTypeExpanded) return undefined;
    const handlePointerDown = (event) => { if (propertyTypeRef.current && !propertyTypeRef.current.contains(event.target)) setPropertyTypeExpanded(false); };
    const handleKeyDown = (event) => { if (event.key === 'Escape') setPropertyTypeExpanded(false); };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('mousedown', handlePointerDown); document.removeEventListener('touchstart', handlePointerDown); document.removeEventListener('keydown', handleKeyDown); };
  }, [propertyTypeExpanded]);

  useEffect(() => {
    if (!filtersExpanded) return undefined;
    const closeFiltersFromOutsideInteraction = (event) => {
      const eventTarget = event.target;
      const clickedFilterToggle = eventTarget && eventTarget.closest ? eventTarget.closest('#header-search-filter-toggle') : null;
      if (clickedFilterToggle) return;
      if (filtersPanelRef.current && filtersPanelRef.current.contains(eventTarget)) return;
      setFiltersExpanded(false);
    };
    const handleKeyDown = (event) => { if (event.key === 'Escape') setFiltersExpanded(false); };
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
    return () => document.body.classList.remove('mobile-filters-open');
  }, [filtersExpanded]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleOpenMobileFilters = () => { setPriceExpanded(false); setRoomsBathsExpanded(false); setPropertyTypeExpanded(false); setFiltersExpanded(true); };
    window.addEventListener('homekey:open-mobile-filters', handleOpenMobileFilters);
    return () => window.removeEventListener('homekey:open-mobile-filters', handleOpenMobileFilters);
  }, []);

  const applySearch = ({ nextCity = city, nextRooms = rooms, nextBaths = baths, nextListingType = listingType, nextPropertyCategory = propertyCategory, nextFeatureFilters = featureFilters, nextMinPriceInput = minPriceInput, nextMaxPriceInput = maxPriceInput, nextLikedOnly = likedOnly } = {}) => {
    const nextSearch = buildSearchQuery({ city: nextCity, rooms: nextRooms, baths: nextBaths, listingType: nextListingType, propertyCategory: nextPropertyCategory, featureFilters: nextFeatureFilters, minPriceInput: nextMinPriceInput, maxPriceInput: nextMaxPriceInput, likedOnly: nextLikedOnly });
    if (location.pathname === '/' && location.search === nextSearch) return;
    history.replace({ pathname: '/', search: nextSearch });
  };

  const applyFilterMenuSearch = (nextSearchOptions) => { keepFilterSheetOpenRef.current = true; applySearch(nextSearchOptions); };

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

  const handlePriceDragStart = (handle) => { setIsPriceDragging(true); setActivePriceHandle(handle); };
  const commitPriceSearch = () => applySearch({ nextMinPriceInput: minPriceDraftRef.current, nextMaxPriceInput: maxPriceDraftRef.current });
  const handlePriceInteractionEnd = () => { setIsPriceDragging(false); setActivePriceHandle(''); commitPriceSearch(); };

  const handleHeaderSearchSubmit = (event) => {
    event.preventDefault();
    saveRecentSearch(city);
    applySearch();
    setPriceExpanded(false); setFiltersExpanded(false); setRoomsBathsExpanded(false); setPropertyTypeExpanded(false);
  };

  const setTransientVoiceStatus = (message, timeoutMs = 2600) => {
    setVoiceSearchStatus(message);
    if (voiceStatusTimerRef.current && typeof window !== 'undefined') { window.clearTimeout(voiceStatusTimerRef.current); voiceStatusTimerRef.current = null; }
    if (!message || timeoutMs <= 0 || typeof window === 'undefined') return;
    voiceStatusTimerRef.current = window.setTimeout(() => { setVoiceSearchStatus(''); voiceStatusTimerRef.current = null; }, timeoutMs);
  };

  const applyInterpretedSearch = (aiSearch) => {
    setCity(aiSearch.city); setRooms(aiSearch.rooms); setBaths(aiSearch.baths); setRoomsDraft(aiSearch.rooms); setBathsDraft(aiSearch.baths);
    setListingType(aiSearch.listingType); setPropertyCategory(aiSearch.propertyCategory); setFeatureFilters(aiSearch.featureFilters);
    setMinPriceInput(aiSearch.minPriceInput); setMaxPriceInput(aiSearch.maxPriceInput);
    minPriceDraftRef.current = aiSearch.minPriceInput; maxPriceDraftRef.current = aiSearch.maxPriceInput;
    applySearch({ nextCity: aiSearch.city, nextRooms: aiSearch.rooms, nextBaths: aiSearch.baths, nextListingType: aiSearch.listingType, nextPropertyCategory: aiSearch.propertyCategory, nextFeatureFilters: aiSearch.featureFilters, nextMinPriceInput: aiSearch.minPriceInput, nextMaxPriceInput: aiSearch.maxPriceInput });
    setPriceExpanded(false); setFiltersExpanded(false); setRoomsBathsExpanded(false); setPropertyTypeExpanded(false);
  };

  const applyAiPrompt = async (rawPrompt = '', { appliedStatus = t('navbar.aiSearchAppliedStatus') } = {}) => {
    const prompt = String(rawPrompt || '').trim();
    if (!prompt) return false;
    setIsAiSearchInterpreting(true);
    setTransientVoiceStatus(t('navbar.aiSearchInterpretingStatus'), 0);
    try {
      const result = await interpretSearchPrompt({ prompt, language });
      const aiSearch = normalizeInterpretedSearch(result?.data?.filters, prompt);
      applyInterpretedSearch(aiSearch);
      setTransientVoiceStatus(result?.data?.fallbackUsed ? t('navbar.aiSearchFallbackStatus') : appliedStatus);
    } catch (_err) {
      applyInterpretedSearch(parseAiSearchInput(prompt));
      setTransientVoiceStatus(t('navbar.aiSearchFallbackStatus'));
    } finally {
      setIsAiSearchInterpreting(false);
    }
    return true;
  };

  const handleMobileAiSearch = () => applyAiPrompt(city);

  const handleMobileVoiceSearch = () => {
    if (isVoiceListening && voiceRecognitionRef.current) {
      try { voiceRecognitionRef.current.stop(); } catch (_err) {}
      setIsVoiceListening(false); setTransientVoiceStatus(t('navbar.voiceSearchStoppedStatus')); return;
    }
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) { setTransientVoiceStatus(t('navbar.voiceSearchUnsupported')); return; }
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; recognition.interimResults = false; recognition.maxAlternatives = 1;
      recognition.lang = language === 'he' ? 'he-IL' : 'en-US';
      recognition.onstart = () => { setIsVoiceListening(true); setTransientVoiceStatus(t('navbar.voiceSearchListeningStatus'), 0); };
      recognition.onresult = async (event) => {
        const transcript = Array.from(event.results || []).map((result) => (result && result[0] ? String(result[0].transcript || '') : '')).join(' ').trim();
        if (!transcript) { setTransientVoiceStatus(t('navbar.voiceSearchNoSpeech')); return; }
        setCity(transcript);
        await applyAiPrompt(transcript, { appliedStatus: t('navbar.voiceSearchAppliedStatus') });
      };
      recognition.onerror = (event) => {
        const errorCode = String(event?.error || '').toLowerCase();
        if (errorCode === 'no-speech') { setTransientVoiceStatus(t('navbar.voiceSearchNoSpeech')); return; }
        if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(errorCode)) { setTransientVoiceStatus(t('navbar.voiceSearchPermissionDenied')); return; }
        setTransientVoiceStatus(t('navbar.voiceSearchGenericError'));
      };
      recognition.onend = () => { setIsVoiceListening(false); voiceRecognitionRef.current = null; setVoiceSearchStatus((currentStatus) => (currentStatus === t('navbar.voiceSearchListeningStatus') ? '' : currentStatus)); };
      voiceRecognitionRef.current = recognition;
      recognition.start();
    } catch (_err) { setIsVoiceListening(false); voiceRecognitionRef.current = null; setTransientVoiceStatus(t('navbar.voiceSearchUnsupported')); }
  };

  const handleFilterMenuMinPriceChange = (rawValue) => {
    const normalizedRaw = String(rawValue || '').trim();
    const parsedValue = normalizedRaw === '' ? PRICE_SLIDER_MIN : clampPriceValue(normalizedRaw);
    const nextMinPriceInput = Math.min(parsedValue, maxPriceInput);
    setMinPriceInput(nextMinPriceInput); minPriceDraftRef.current = nextMinPriceInput;
    applyFilterMenuSearch({ nextMinPriceInput });
  };

  const handleFilterMenuMaxPriceChange = (rawValue) => {
    const normalizedRaw = String(rawValue || '').trim();
    const parsedValue = normalizedRaw === '' ? PRICE_SLIDER_MAX : clampPriceValue(normalizedRaw);
    const nextMaxPriceInput = Math.max(parsedValue, minPriceInput);
    setMaxPriceInput(nextMaxPriceInput); maxPriceDraftRef.current = nextMaxPriceInput;
    applyFilterMenuSearch({ nextMaxPriceInput });
  };

  const handleTogglePropertyCategory = (nextCategory) => {
    const normalizedCategory = String(nextCategory || '').trim().toLowerCase();
    if (!PROPERTY_CATEGORY_OPTIONS.includes(normalizedCategory)) return;
    const resolvedCategory = propertyCategory === normalizedCategory ? '' : normalizedCategory;
    setPropertyCategory(resolvedCategory);
    applyFilterMenuSearch({ nextPropertyCategory: resolvedCategory });
  };

  const handleToggleFeatureFilter = (featureId) => {
    const normalizedFeature = String(featureId || '').trim().toLowerCase();
    if (!FEATURE_FILTER_OPTIONS.includes(normalizedFeature)) return;
    const nextFeatureFilters = featureFilters.includes(normalizedFeature) ? featureFilters.filter((value) => value !== normalizedFeature) : [...featureFilters, normalizedFeature];
    setFeatureFilters(nextFeatureFilters);
    applyFilterMenuSearch({ nextFeatureFilters });
  };

  const handleFilterMenuListingTypeChange = (nextListingType) => {
    const normalizedListingType = sanitizeListingType(nextListingType);
    setListingType(normalizedListingType);
    if (normalizedListingType === 'roommates') { setPropertyTypeExpanded(false); setFiltersExpanded(true); }
    applyFilterMenuSearch({ nextListingType: normalizedListingType });
  };

  const handleRoommatesNavClick = () => {
    setPriceExpanded(false); setRoomsBathsExpanded(false); setPropertyTypeExpanded(false);
    setListingType('roommates');
    setRoommateLocationDraft(city);
    applySearch({ nextListingType: 'roommates' });
    setFiltersExpanded(true);
  };

  const handleFilterMenuRoomsChange = (nextRooms) => {
    const normalizedRooms = String(nextRooms || '').trim();
    setRooms(normalizedRooms); setRoomsDraft(normalizedRooms);
    applyFilterMenuSearch({ nextRooms: normalizedRooms });
  };

  const handleFilterMenuBathsChange = (nextBaths) => {
    const normalizedBaths = String(nextBaths || '').trim();
    setBaths(normalizedBaths); setBathsDraft(normalizedBaths);
    applyFilterMenuSearch({ nextBaths: normalizedBaths });
  };

  const handleClearAllFilters = () => {
    setRooms(''); setBaths(''); setRoomsDraft(''); setBathsDraft('');
    setListingType('all'); setPropertyCategory(''); setFeatureFilters([]);
    setRoommateLocationDraft('');
    setMinPriceInput(PRICE_SLIDER_MIN); setMaxPriceInput(PRICE_SLIDER_MAX);
    minPriceDraftRef.current = PRICE_SLIDER_MIN; maxPriceDraftRef.current = PRICE_SLIDER_MAX;
    setFiltersExpanded(false); setPropertyTypeExpanded(false);
    applySearch({ nextRooms: '', nextBaths: '', nextListingType: 'all', nextPropertyCategory: '', nextFeatureFilters: [], nextMinPriceInput: PRICE_SLIDER_MIN, nextMaxPriceInput: PRICE_SLIDER_MAX });
  };

  const handleApplyFilterMenu = () => {
    const nextCity = listingType === 'roommates' ? roommateLocationDraft : city;
    setCity(nextCity);
    applySearch({ nextCity });
    setFiltersExpanded(false);
  };

  const handleSaveFilterMenu = () => {
    setIsSavingSearch(true); setSaveSearchStatus('Saving...');
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('homekey:save-current-search'));
  };

  const hasCustomPrice = minPriceInput > PRICE_SLIDER_MIN || maxPriceInput < PRICE_SLIDER_MAX;
  const roomOptions = useMemo(() => ROOM_OPTION_VALUES.map((value) => {
    if (value === '') return { value: '', label: t('common.any') };
    if (value === 'studio') return { value: 'studio', label: t('navbar.studio') };
    return { value, label: value };
  }), [t]);
  const bathOptions = useMemo(() => BATH_OPTION_VALUES.map((value) => ({ value, label: value === '' ? t('common.any') : value })), [t]);
  const roomsBathsSummaryLabel = getRoomsBathsSummaryLabel({ rooms, baths, roomOptions, bathOptions, t });
  const interestSummary = useMemo(() => getInterestSummary(), [interestVersion]);
  const likedCount = (interestSummary.favoriteIds || []).length;
  const userFirstName = getUserFirstName(user);
  const greetingName = userFirstName || t('navbar.myAccount');
  const isListingsRoute = location.pathname === '/';
  const alertsOverlayTarget = useMemo(() => {
    const params = new URLSearchParams(location.pathname === '/' ? location.search : '');
    params.set('alerts', '1');
    const serialized = params.toString();
    return { pathname: '/', search: serialized ? `?${serialized}` : '?alerts=1' };
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAuthenticated || !isListingsRoute) return;
    if (window.sessionStorage.getItem(SAVE_SEARCH_AFTER_AUTH_SESSION_KEY) !== '1') return;
    window.sessionStorage.removeItem(SAVE_SEARCH_AFTER_AUTH_SESSION_KEY);
    if (deferredAutoSaveTimerRef.current) window.clearTimeout(deferredAutoSaveTimerRef.current);
    setIsSavingSearch(true); setSaveSearchStatus('Saving...');
    deferredAutoSaveTimerRef.current = window.setTimeout(() => { window.dispatchEvent(new CustomEvent('homekey:save-current-search')); deferredAutoSaveTimerRef.current = null; }, 180);
  }, [isAuthenticated, isListingsRoute]);

  const handleLogoutFromGreeting = () => { logout(); history.push('/'); };

  const likedStateMessage = likedOnly ? t('navbar.likedOnlyStateMessage') : t('navbar.allListingsStateMessage');
  const likedAriaLabel = t('navbar.likedAriaLabel', { count: likedCount, stateMessage: likedStateMessage });
  const likedHeaderButton = (
    <button type="button" className={`premium-header__likes premium-header__likes--action ${likedOnly ? 'is-active' : ''}`}
      onClick={() => { const nextLikedOnly = !likedOnly; setLikedOnly(nextLikedOnly); applySearch({ nextLikedOnly }); }}
      aria-live="polite" aria-label={likedAriaLabel} aria-pressed={likedOnly}>
      <span className={`premium-header__likes-heart ${likedOnly ? 'is-active' : ''}`} aria-hidden="true">
        <span className="property-heart-icon-wrap">
          <svg className="property-heart-icon" viewBox="0 0 24 24" focusable="false">
            <path d="M12 21s-6.6-4.5-9.1-8.2C.8 9.5 1.5 5.8 4.5 4c2.2-1.3 5-.7 6.7 1.2L12 6l.8-.8c1.8-1.9 4.5-2.4 6.7-1.2 3 1.8 3.7 5.5 1.6 8.8C18.6 16.5 12 21 12 21Z" />
          </svg>
        </span>
      </span>
      <div className="premium-header__likes-copy"><span>{t('navbar.likedCount', { count: likedCount })}</span></div>
    </button>
  );

  const languageTarget = language === 'he' ? 'English' : 'עברית';
  const homeKeyBrand = t('brand.homeKey');
  const hasAdvancedFilters = featureFilters.length > 0;
  const isRoommatesActive = listingType === 'roommates';
  const propertyTypeSummary = propertyCategory ? t(`filterMenu.${propertyCategory}`) : (listingType !== 'all' && listingType !== 'roommates' ? t(`filterMenu.${listingType}`) : t('navbar.propertyType'));

  const handleCityChange = useCallback((val) => setCity(val), []);
  const handleRoommateLocationChange = useCallback((val) => setRoommateLocationDraft(val), []);
  const renderRoommateLocationInput = useCallback(({ id, value, onChange, placeholder }) => (
    <LocationAutocomplete
      inputId={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      language={language}
      isHebrew={isHebrew}
      wrapperClassName="location-autocomplete--roommate"
      inputClassName="roommate-text-input"
    />
  ), [language, isHebrew]);
  const handleCitySelect = useCallback((val) => {
    setCity(val);
    applySearch({ nextCity: val });
  }, [applySearch]);
  const handleCityBlur = useCallback((event) => applySearch({ nextCity: event.target.value }), [applySearch]);

  return (
    <nav className="premium-header" aria-label={t('navbar.propertySearchAriaLabel')}>
      <div className="premium-header__inner">
        <div className="premium-header__brand-cell">
          <Link to="/" className="premium-header__brand" aria-label={t('navbar.homeAriaLabel', { brand: homeKeyBrand })}>
            <img className="premium-header__brand-image" src={hKeyholeLogo} alt="" aria-hidden="true" />
            <span className="premium-header__brand-wordmark">{homeKeyBrand}</span>
          </Link>
        </div>

        <div className="premium-header__search-cell">
          <form className="premium-header__search-form" onSubmit={handleHeaderSearchSubmit}>
            <div className="premium-header__search-pill" role="group" aria-label={t('navbar.propertySearchAriaLabel')}>

              {/* ── LOCATION with Autocomplete ── */}
              <div className="premium-header__search-segment premium-header__search-segment--location">
                <HeaderIcon name="location" />
                <LocationAutocomplete
                  value={city}
                  onChange={handleCityChange}
                  onSelect={handleCitySelect}
                  onBlur={handleCityBlur}
                  placeholder={t('navbar.location')}
                  language={language}
                  isHebrew={isHebrew}
                />
              </div>

              <div className="premium-header__search-segment premium-header__search-segment--voice">
                <button type="button" className={`premium-header__voice-toggle ${isVoiceListening ? 'is-listening' : ''}`}
                  aria-label={isVoiceListening ? t('navbar.voiceSearchStopAriaLabel') : t('navbar.voiceSearchAriaLabel')}
                  onClick={handleMobileVoiceSearch}>
                  <span>{t('navbar.voiceSearch')}</span>
                </button>
              </div>

              <div className="premium-header__search-segment premium-header__search-segment--ai">
                <button type="button" className={`premium-header__ai-toggle ${city.trim() ? 'is-active' : ''}`}
                  aria-label={t('navbar.aiSearchAriaLabel')} onClick={handleMobileAiSearch}
                  disabled={!city.trim() || isAiSearchInterpreting} aria-busy={isAiSearchInterpreting}>
                  <span>{isAiSearchInterpreting ? t('navbar.aiSearchLoading') : t('navbar.aiSearch')}</span>
                </button>
              </div>

              <div className="premium-header__search-segment premium-header__search-segment--price" ref={priceRef}>
                <button id="header-search-price-toggle" type="button"
                  className={`premium-header__price-toggle ${hasCustomPrice ? 'is-active' : ''}`}
                  aria-live="polite" aria-expanded={priceExpanded} aria-controls="header-price-slider-panel"
                  onClick={() => { setRoomsBathsExpanded(false); setPropertyTypeExpanded(false); setFiltersExpanded(false); setPriceExpanded((isExpanded) => !isExpanded); }}>
                  <HeaderIcon name="price" />
                  <span>{t('filterMenu.priceRange')}</span>
                </button>
                <div id="header-price-slider-panel" className={`premium-header__price-panel ${priceExpanded ? 'is-open' : ''}`}>
                  <div className="premium-header__price-values" aria-hidden="true">
                    <span>{formatPriceSliderLabel(minPriceInput, false, locale)}</span>
                    <span>—</span>
                    <span>{formatPriceSliderLabel(maxPriceInput, true, locale)}</span>
                  </div>
                  <div className="premium-header__price-track" style={{ '--min-price-percent': `${minSliderPercent}%`, '--max-price-percent': `${maxSliderPercent}%` }}>
                    <input type="range" min={PRICE_SLIDER_MIN} max={PRICE_SLIDER_MAX} step={PRICE_SLIDER_STEP} value={minPriceInput}
                      onChange={handleMinPriceSliderChange} onMouseDown={() => handlePriceDragStart('min')} onTouchStart={() => handlePriceDragStart('min')}
                      onMouseUp={handlePriceInteractionEnd} onTouchEnd={handlePriceInteractionEnd} onTouchCancel={handlePriceInteractionEnd}
                      onKeyUp={handlePriceInteractionEnd} onBlur={handlePriceInteractionEnd}
                      className={`premium-header__price-slider premium-header__price-slider--min ${activePriceHandle === 'min' ? 'is-active' : ''}`}
                      aria-label={t('navbar.minimumPriceAriaLabel')} />
                    <input type="range" min={PRICE_SLIDER_MIN} max={PRICE_SLIDER_MAX} step={PRICE_SLIDER_STEP} value={maxPriceInput}
                      onChange={handleMaxPriceSliderChange} onMouseDown={() => handlePriceDragStart('max')} onTouchStart={() => handlePriceDragStart('max')}
                      onMouseUp={handlePriceInteractionEnd} onTouchEnd={handlePriceInteractionEnd} onTouchCancel={handlePriceInteractionEnd}
                      onKeyUp={handlePriceInteractionEnd} onBlur={handlePriceInteractionEnd}
                      className={`premium-header__price-slider premium-header__price-slider--max ${activePriceHandle === 'max' ? 'is-active' : ''}`}
                      aria-label={t('navbar.maximumPriceAriaLabel')} />
                  </div>
                </div>
              </div>

              <div className="premium-header__search-segment premium-header__search-segment--rooms" ref={roomsBathsRef}>
                <button id="header-search-rooms-toggle" type="button"
                  className={`premium-header__rooms-toggle ${rooms || baths ? 'is-active' : ''}`}
                  onClick={() => { setPriceExpanded(false); setPropertyTypeExpanded(false); setFiltersExpanded(false); setRoomsBathsExpanded((isExpanded) => { const nextExpanded = !isExpanded; if (nextExpanded) { setRoomsDraft(rooms); setBathsDraft(baths); } return nextExpanded; }); }}
                  aria-expanded={roomsBathsExpanded} aria-controls="header-rooms-baths-panel">
                  <HeaderIcon name="bed" />
                  <span>{roomsBathsSummaryLabel}</span>
                </button>
                <div id="header-rooms-baths-panel" className={`premium-header__rooms-panel ${roomsBathsExpanded ? 'is-open' : ''}`}>
                  <div className="premium-header__rooms-section">
                    <p className="premium-header__rooms-section-title">{t('navbar.bedrooms')}</p>
                    <div className="premium-header__rooms-options-grid">
                      {roomOptions.map((option) => (
                        <button key={option.value || 'any-rooms'} type="button"
                          className={`premium-header__chip-btn ${roomsDraft === option.value ? 'is-selected' : ''}`}
                          onClick={() => setRoomsDraft(option.value)}>{option.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="premium-header__rooms-section">
                    <p className="premium-header__rooms-section-title">{t('navbar.bathrooms')}</p>
                    <div className="premium-header__rooms-options-grid premium-header__rooms-options-grid--baths">
                      {bathOptions.map((option) => (
                        <button key={option.value || 'any-baths'} type="button"
                          className={`premium-header__chip-btn ${bathsDraft === option.value ? 'is-selected' : ''}`}
                          onClick={() => setBathsDraft(option.value)}>{option.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="premium-header__rooms-panel-actions">
                    <button type="button" className="premium-header__rooms-clear-btn"
                      onClick={() => { setRoomsDraft(''); setBathsDraft(''); setRooms(''); setBaths(''); applySearch({ nextRooms: '', nextBaths: '' }); }}>
                      {t('navbar.clearSelections')}
                    </button>
                    <button type="button" className="premium-header__rooms-done-btn"
                      onClick={() => { setRooms(roomsDraft); setBaths(bathsDraft); applySearch({ nextRooms: roomsDraft, nextBaths: bathsDraft }); setRoomsBathsExpanded(false); }}>
                      {t('navbar.done')}
                    </button>
                  </div>
                </div>
              </div>

              {/* ── PROPERTY TYPE ── */}
              <div className="premium-header__search-segment premium-header__search-segment--property-type" ref={propertyTypeRef}>
                <button id="header-search-property-type-toggle" type="button"
                  className={`premium-header__property-type-toggle ${listingType !== 'all' && listingType !== 'roommates' || propertyCategory ? 'is-active' : ''}`}
                  onClick={() => { setPriceExpanded(false); setRoomsBathsExpanded(false); setFiltersExpanded(false); setPropertyTypeExpanded((value) => !value); }}
                  aria-expanded={propertyTypeExpanded} aria-controls="header-property-type-panel">
                  <HeaderIcon name="building" />
                  <span>{propertyTypeSummary}</span>
                </button>
                <div id="header-property-type-panel" className={`premium-header__property-type-panel ${propertyTypeExpanded ? 'is-open' : ''}`}>
                  <div className="premium-header__property-type-section">
                    <p className="premium-header__rooms-section-title">{t('filterMenu.listingType')}</p>
                    <div className="premium-header__rooms-options-grid">
                      {LISTING_TYPE_OPTIONS.map((typeOption) => (
                        <button key={typeOption} type="button"
                          className={`premium-header__chip-btn ${listingType === typeOption ? 'is-selected' : ''}`}
                          onClick={() => handleFilterMenuListingTypeChange(typeOption)}>
                          {t(`filterMenu.${typeOption}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="premium-header__property-type-section">
                    <p className="premium-header__rooms-section-title">{t('filterMenu.propertyTypes')}</p>
                    <div className="premium-header__rooms-options-grid">
                      {PROPERTY_CATEGORY_OPTIONS.map((categoryOption) => (
                        <button key={categoryOption} type="button"
                          className={`premium-header__chip-btn ${propertyCategory === categoryOption ? 'is-selected' : ''}`}
                          onClick={() => handleTogglePropertyCategory(categoryOption)}>
                          {t(`filterMenu.${categoryOption}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── ROOMMATES ── */}
              <div className="premium-header__search-segment premium-header__search-segment--roommates">
                <button type="button" className={`premium-header__roommates-toggle ${isRoommatesActive ? 'is-active' : ''}`}
                  onClick={handleRoommatesNavClick} aria-pressed={isRoommatesActive}>
                  <HeaderIcon name="roommates" />
                  <span>{t('filterMenu.roommates')}</span>
                </button>
              </div>

              {/* ── ALL FILTERS ── */}
              <div className="premium-header__search-segment premium-header__search-segment--all-filters" ref={filtersRef}>
                <button id="header-search-filter-toggle" type="button"
                  className={`premium-header__filters-toggle ${hasAdvancedFilters ? 'is-active' : ''}`}
                  onClick={() => { setPriceExpanded(false); setRoomsBathsExpanded(false); setPropertyTypeExpanded(false); if (isRoommatesActive) setRoommateLocationDraft(city); setFiltersExpanded((value) => !value); }}
                  aria-expanded={filtersExpanded} aria-controls="header-filters-panel">
                  <HeaderIcon name="filters" />
                  <span>{t('navbar.allFilters')}</span>
                </button>
                <div id="header-filters-panel" ref={filtersPanelRef}
                  className={`premium-header__filters-panel ${isRoommatesActive ? 'premium-header__filters-panel--roommates' : ''} ${filtersExpanded ? 'is-open' : ''} is-mobile-sheet`}
                  style={{ background: 'var(--color-surface, #fff)', isolation: 'isolate', ...(isHebrew ? { left: 0, right: 'auto' } : { right: 0, left: 'auto' }) }}>
                  <FilterMenu
                    onClearAllFilters={handleClearAllFilters} listingType={listingType} roomOptions={roomOptions}
                    bathOptions={bathOptions} rooms={rooms} baths={baths} minPrice={minPriceInput} maxPrice={maxPriceInput}
                    propertyCategory={propertyCategory} selectedFeatures={featureFilters}
                    onListingTypeChange={handleFilterMenuListingTypeChange} onRoomsChange={handleFilterMenuRoomsChange}
                    onBathsChange={handleFilterMenuBathsChange} onMinPriceChange={handleFilterMenuMinPriceChange}
                    onMaxPriceChange={handleFilterMenuMaxPriceChange} onTogglePropertyCategory={handleTogglePropertyCategory}
                    onToggleFeature={handleToggleFeatureFilter} onApplyFilters={handleApplyFilterMenu} onSaveFilters={handleSaveFilterMenu}
                    roommateLocation={roommateLocationDraft} onRoommateLocationChange={handleRoommateLocationChange}
                    renderRoommateLocationInput={renderRoommateLocationInput} />
                  <button type="button" className="mobile-filter-sheet-close-btn" onClick={() => setFiltersExpanded(false)}>
                    {t('navbar.showResults')}
                  </button>
                </div>
                {filtersExpanded && (
                  <button type="button" className="mobile-filter-sheet-backdrop is-visible" aria-label="Close filters panel backdrop"
                    onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); setFiltersExpanded(false); }}
                    onClick={(event) => { event.preventDefault(); event.stopPropagation(); setFiltersExpanded(false); }} />
                )}
              </div>
            </div>

            {voiceSearchStatus && <p className="premium-header__voice-status" aria-live="polite">{voiceSearchStatus}</p>}
            <button type="submit" className="premium-header__search-submit" aria-label={t('navbar.applySearchAriaLabel')}>{t('navbar.search')}</button>
          </form>
        </div>

        <div className={`premium-header__actions premium-header__actions-cell${isHebrew ? ' premium-header__actions--hebrew' : ''}`}>
          {isHebrew ? (
            <>
              {likedHeaderButton}
              <button className="premium-header__language-toggle" type="button"
                aria-label={t('navbar.languageToggleAriaLabel', { targetLanguage: languageTarget })}
                title={t('navbar.languageToggleAriaLabel', { targetLanguage: languageTarget })}
                onClick={toggleLanguage}>
                <span className="premium-header__language-text">{languageTarget}</span>
              </button>
              <Link to="/add-listing" className="premium-header__cta premium-header__action-pill"
                style={{ padding: '12px 24px', fontSize: '15px', marginLeft: '16px', marginRight: '16px' }}>
                {t('navbar.listProperty')}
              </Link>
              <span className="premium-header__actions-utility">
                <Link to={isAuthenticated ? alertsOverlayTarget : '/login'} className="premium-header__alerts-link">{t('navbar.myAlerts')}</Link>
                {isAuthenticated && <Link to="/account" className="premium-header__alerts-link">{t('navbar.myAccount')}</Link>}
                {isAuthenticated ? (
                  <button type="button" className="premium-header__greeting"
                    aria-label={t('navbar.logoutAriaLabel', { name: greetingName })}
                    title={t('navbar.logoutAriaLabel', { name: greetingName })}
                    onClick={handleLogoutFromGreeting}>
                    <span className="premium-header__greeting-label">{t('navbar.hello')}</span>
                    <span className="premium-header__greeting-name">{greetingName}</span>
                  </button>
                ) : (
                  <Link to="/login" className="premium-header__login"><HeaderIcon name="user" /><span>{t('navbar.login')}</span></Link>
                )}
              </span>
            </>
          ) : (
            <>
              {likedHeaderButton}
              <button className="premium-header__language-toggle" type="button"
                aria-label={t('navbar.languageToggleAriaLabel', { targetLanguage: languageTarget })}
                title={t('navbar.languageToggleAriaLabel', { targetLanguage: languageTarget })}
                onClick={toggleLanguage}>
                <span className="premium-header__language-text">{languageTarget}</span>
              </button>
              <Link to="/add-listing" className="premium-header__cta premium-header__action-pill"
                style={{ padding: '12px 24px', fontSize: '15px', marginLeft: '16px', marginRight: '16px' }}>
                {t('navbar.listProperty')}
              </Link>
              <Link to={isAuthenticated ? alertsOverlayTarget : '/login'} className="premium-header__alerts-link">{t('navbar.myAlerts')}</Link>
              {isAuthenticated && <Link to="/account" className="premium-header__alerts-link">{t('navbar.myAccount')}</Link>}
              {isAuthenticated ? (
                <button type="button" className="premium-header__greeting"
                  aria-label={t('navbar.logoutAriaLabel', { name: greetingName })}
                  title={t('navbar.logoutAriaLabel', { name: greetingName })}
                  onClick={handleLogoutFromGreeting}>
                  <span className="premium-header__greeting-label">{t('navbar.hello')}</span>
                  <span className="premium-header__greeting-name">{greetingName}</span>
                </button>
              ) : (
                <Link to="/login" className="premium-header__login"><HeaderIcon name="user" /><span>{t('navbar.login')}</span></Link>
              )}
            </>
          )}
        </div>
        <Link to="/add-listing" className="premium-header__cta premium-header__mobile-cta premium-header__action-pill">
          {t('navbar.listProperty')}
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
