import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import homeKeyWordmark from '../assets/H Logo Gemini_Generated_Image_8ckrj88ckrj88ckr.png';
import FilterMenu from './FilterMenu';
import { getInterestSummary } from '../utils/propertyInterest';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const PRICE_SLIDER_MIN = 0;
const PRICE_SLIDER_MAX = 20000;
const PRICE_SLIDER_STEP = 500;
const ROOM_OPTION_VALUES = ['', 'studio', '1', '2', '3', '4+'];
const BATH_OPTION_VALUES = ['', '1', '2', '3+'];
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
const AI_LISTING_TYPE_KEYWORDS = {
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
};
const getSpeechRecognitionConstructor = () => {
  if (typeof window === 'undefined') return null;
  const recognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  return typeof recognitionConstructor === 'function' ? recognitionConstructor : null;
};
const SAVE_SEARCH_AUTH_INTENT = 'save-search';
const SAVE_SEARCH_AFTER_AUTH_SESSION_KEY = 'homekey:save-search-after-auth';

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

const getPriceSummaryLabel = (minValue, maxValue, locale = 'en-US') => {
  const minLabel = formatPriceSliderLabel(minValue, false, locale);
  const maxLabel = formatPriceSliderLabel(maxValue, true, locale);
  return `${minLabel} - ${maxLabel}`;
};

const sanitizeListingType = (rawValue) => {
  const normalized = String(rawValue || '').toLowerCase();
  if (normalized === 'sale' || normalized === 'rental') return normalized;
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
  const normalized = String(rawToken || '')
    .trim()
    .toLowerCase()
    .replace(/[$₪,\s]/g, '');
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

  const betweenMatch = normalized.match(
    /(?:between|from)\s*[$₪]?\s*([\d.,k]+)\s*(?:and|to|-)\s*[$₪]?\s*([\d.,k]+)/
  );
  if (betweenMatch) {
    const firstValue = parseAiBudgetToken(betweenMatch[1]);
    const secondValue = parseAiBudgetToken(betweenMatch[2]);
    if (firstValue != null && secondValue != null) {
      minPriceInput = clampPriceValue(Math.min(firstValue, secondValue));
      maxPriceInput = clampPriceValue(Math.max(firstValue, secondValue));
      return { minPriceInput, maxPriceInput };
    }
  }

  const maxMatch = normalized.match(
    /(?:under|below|max(?:imum)?|up to|less than)\s*[$₪]?\s*([\d.,k]+)/
  );
  if (maxMatch) {
    const parsedMax = parseAiBudgetToken(maxMatch[1]);
    if (parsedMax != null) maxPriceInput = clampPriceValue(parsedMax);
  }

  const minMatch = normalized.match(
    /(?:over|above|min(?:imum)?|starting at|at least)\s*[$₪]?\s*([\d.,k]+)/
  );
  if (minMatch) {
    const parsedMin = parseAiBudgetToken(minMatch[1]);
    if (parsedMin != null) minPriceInput = clampPriceValue(parsedMin);
  }

  if (minPriceInput > maxPriceInput) {
    const midpoint = Math.round((minPriceInput + maxPriceInput) / 2 / PRICE_SLIDER_STEP) * PRICE_SLIDER_STEP;
    return { minPriceInput: midpoint, maxPriceInput: midpoint };
  }

  return { minPriceInput, maxPriceInput };
};

const extractAiCityCandidate = (rawInput = '') => {
  const strippedText = String(rawInput || '')
    .replace(/[$₪]/g, ' ')
    .replace(/\b(\d+[.,]?\d*k?|studio|bed(?:room)?s?|br|bath(?:room)?s?|ba|rent|rental|lease|buy|sale|purchase|house|home|apartment|flat|condo|villa|duplex|townhouse|parking|garage|carport|elevator|lift|pet(?:s)?|dog|cat|accessible|wheelchair|disabled|renovated|refurbished|furnished|mamad|safe room|security room|under|below|max(?:imum)?|up to|less than|over|above|min(?:imum)?|starting at|at least|between|from|to|and|with|in|near|around|at)\b/gi, ' ')
    .replace(/[^a-zA-Z\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!strippedText) return '';
  return strippedText
    .split(/\s+/)
    .slice(0, 4)
    .join(' ')
    .trim();
};

const parseAiSearchInput = (rawInput = '') => {
  const trimmedInput = String(rawInput || '').trim();
  const normalized = trimmedInput.toLowerCase();

  let listingType = 'all';
  if (includesAnyKeyword(normalized, AI_LISTING_TYPE_KEYWORDS.rental)) {
    listingType = 'rental';
  } else if (includesAnyKeyword(normalized, AI_LISTING_TYPE_KEYWORDS.sale)) {
    listingType = 'sale';
  }

  let propertyCategory = '';
  if (includesAnyKeyword(normalized, AI_PROPERTY_CATEGORY_KEYWORDS.apartments)) {
    propertyCategory = 'apartments';
  } else if (includesAnyKeyword(normalized, AI_PROPERTY_CATEGORY_KEYWORDS.houses)) {
    propertyCategory = 'houses';
  }

  const featureFilters = FEATURE_FILTER_OPTIONS.filter((featureId) =>
    includesAnyKeyword(normalized, AI_FEATURE_KEYWORDS[featureId] || [])
  );

  let rooms = '';
  if (/\bstudio\b/i.test(normalized)) {
    rooms = 'studio';
  } else {
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

  return {
    city,
    rooms,
    baths,
    listingType,
    propertyCategory,
    featureFilters,
    minPriceInput,
    maxPriceInput,
  };
};

const getRoomsBathsSummaryLabel = ({
  rooms = '',
  baths = '',
  roomOptions = [],
  bathOptions = [],
  t,
}) => {
  const normalizedRooms = String(rooms || '').trim();
  const normalizedBaths = String(baths || '').trim();
  if (!normalizedRooms && !normalizedBaths) return t('navbar.roomsBathsDefault');
  const roomOption = roomOptions.find((option) => option.value === normalizedRooms);
  const bathOption = bathOptions.find((option) => option.value === normalizedBaths);
  const summaryParts = [];
  if (roomOption) summaryParts.push(`${roomOption.label}${t('navbar.roomSummarySuffix')}`);
  if (bathOption) summaryParts.push(`${bathOption.label}${t('navbar.bathSummarySuffix')}`);
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
  const listingType = sanitizeListingType(params.get('type') || 'all');
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
  const { isAuthenticated, user, logout } = useAuth();
  const { language, locale, toggleLanguage, t } = useLanguage();
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
  const [isSavingSearch, setIsSavingSearch] = useState(false);
  const [saveSearchStatus, setSaveSearchStatus] = useState('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceSearchStatus, setVoiceSearchStatus] = useState('');
  const priceRef = useRef(null);
  const roomsBathsRef = useRef(null);
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
    const keepFilterSheetOpen = keepFilterSheetOpenRef.current;
    keepFilterSheetOpenRef.current = false;
    setFiltersExpanded((currentValue) => (keepFilterSheetOpen ? currentValue : false));
    setRoomsBathsExpanded(false);
  }, [parsedFromLocation]);

  useEffect(() => () => {
    if (saveSearchFeedbackTimerRef.current) {
      window.clearTimeout(saveSearchFeedbackTimerRef.current);
      saveSearchFeedbackTimerRef.current = null;
    }
    if (deferredAutoSaveTimerRef.current) {
      window.clearTimeout(deferredAutoSaveTimerRef.current);
      deferredAutoSaveTimerRef.current = null;
    }
    if (voiceStatusTimerRef.current) {
      window.clearTimeout(voiceStatusTimerRef.current);
      voiceStatusTimerRef.current = null;
    }
    if (voiceRecognitionRef.current) {
      try {
        voiceRecognitionRef.current.stop();
      } catch (_err) {
        // Ignore failures while unmounting; recognition session may already be closed.
      }
      voiceRecognitionRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleSaveSearchResult = (event) => {
      const success = Boolean(event?.detail?.success);
      setIsSavingSearch(false);
      setSaveSearchStatus(success ? 'saved' : 'failed');
      if (saveSearchFeedbackTimerRef.current) {
        window.clearTimeout(saveSearchFeedbackTimerRef.current);
      }
      saveSearchFeedbackTimerRef.current = window.setTimeout(() => {
        setSaveSearchStatus('');
        saveSearchFeedbackTimerRef.current = null;
      }, success ? 2800 : 3200);
    };
    window.addEventListener('homekey:save-current-search-result', handleSaveSearchResult);
    return () => {
      window.removeEventListener('homekey:save-current-search-result', handleSaveSearchResult);
    };
  }, []);

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

  const applyFilterMenuSearch = (nextSearchOptions) => {
    keepFilterSheetOpenRef.current = true;
    applySearch(nextSearchOptions);
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

  const setTransientVoiceStatus = (message, timeoutMs = 2600) => {
    setVoiceSearchStatus(message);
    if (voiceStatusTimerRef.current && typeof window !== 'undefined') {
      window.clearTimeout(voiceStatusTimerRef.current);
      voiceStatusTimerRef.current = null;
    }
    if (!message || timeoutMs <= 0 || typeof window === 'undefined') return;
    voiceStatusTimerRef.current = window.setTimeout(() => {
      setVoiceSearchStatus('');
      voiceStatusTimerRef.current = null;
    }, timeoutMs);
  };

  const applyAiPrompt = (rawPrompt = '') => {
    const prompt = String(rawPrompt || '').trim();
    if (!prompt) return;
    const aiSearch = parseAiSearchInput(prompt);
    setCity(aiSearch.city);
    setRooms(aiSearch.rooms);
    setBaths(aiSearch.baths);
    setRoomsDraft(aiSearch.rooms);
    setBathsDraft(aiSearch.baths);
    setListingType(aiSearch.listingType);
    setPropertyCategory(aiSearch.propertyCategory);
    setFeatureFilters(aiSearch.featureFilters);
    setMinPriceInput(aiSearch.minPriceInput);
    setMaxPriceInput(aiSearch.maxPriceInput);
    minPriceDraftRef.current = aiSearch.minPriceInput;
    maxPriceDraftRef.current = aiSearch.maxPriceInput;
    applySearch({
      nextCity: aiSearch.city,
      nextRooms: aiSearch.rooms,
      nextBaths: aiSearch.baths,
      nextListingType: aiSearch.listingType,
      nextPropertyCategory: aiSearch.propertyCategory,
      nextFeatureFilters: aiSearch.featureFilters,
      nextMinPriceInput: aiSearch.minPriceInput,
      nextMaxPriceInput: aiSearch.maxPriceInput,
    });
    setPriceExpanded(false);
    setFiltersExpanded(false);
    setRoomsBathsExpanded(false);
    return true;
  };

  const handleMobileAiSearch = () => {
    applyAiPrompt(city);
  };

  const handleMobileVoiceSearch = () => {
    if (isVoiceListening && voiceRecognitionRef.current) {
      try {
        voiceRecognitionRef.current.stop();
      } catch (_err) {
        // Ignore stop errors; this is best-effort.
      }
      setIsVoiceListening(false);
      setTransientVoiceStatus(t('navbar.voiceSearchStoppedStatus'));
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setTransientVoiceStatus(t('navbar.voiceSearchUnsupported'));
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.lang = language === 'he' ? 'he-IL' : 'en-US';

      recognition.onstart = () => {
        setIsVoiceListening(true);
        setTransientVoiceStatus(t('navbar.voiceSearchListeningStatus'), 0);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results || [])
          .map((result) => (result && result[0] ? String(result[0].transcript || '') : ''))
          .join(' ')
          .trim();
        if (!transcript) {
          setTransientVoiceStatus(t('navbar.voiceSearchNoSpeech'));
          return;
        }
        setCity(transcript);
        const applied = applyAiPrompt(transcript);
        if (applied) setTransientVoiceStatus(t('navbar.voiceSearchAppliedStatus'));
      };

      recognition.onerror = (event) => {
        const errorCode = String(event?.error || '').toLowerCase();
        if (errorCode === 'no-speech') {
          setTransientVoiceStatus(t('navbar.voiceSearchNoSpeech'));
          return;
        }
        if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(errorCode)) {
          setTransientVoiceStatus(t('navbar.voiceSearchPermissionDenied'));
          return;
        }
        setTransientVoiceStatus(t('navbar.voiceSearchGenericError'));
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
        voiceRecognitionRef.current = null;
        setVoiceSearchStatus((currentStatus) => (
          currentStatus === t('navbar.voiceSearchListeningStatus') ? '' : currentStatus
        ));
      };

      voiceRecognitionRef.current = recognition;
      recognition.start();
    } catch (_err) {
      setIsVoiceListening(false);
      voiceRecognitionRef.current = null;
      setTransientVoiceStatus(t('navbar.voiceSearchUnsupported'));
    }
  };

  const handleFilterMenuMinPriceChange = (rawValue) => {
    const normalizedRaw = String(rawValue || '').trim();
    const parsedValue = normalizedRaw === '' ? PRICE_SLIDER_MIN : clampPriceValue(normalizedRaw);
    const nextMinPriceInput = Math.min(parsedValue, maxPriceInput);
    setMinPriceInput(nextMinPriceInput);
    minPriceDraftRef.current = nextMinPriceInput;
    applyFilterMenuSearch({ nextMinPriceInput });
  };

  const handleFilterMenuMaxPriceChange = (rawValue) => {
    const normalizedRaw = String(rawValue || '').trim();
    const parsedValue = normalizedRaw === '' ? PRICE_SLIDER_MAX : clampPriceValue(normalizedRaw);
    const nextMaxPriceInput = Math.max(parsedValue, minPriceInput);
    setMaxPriceInput(nextMaxPriceInput);
    maxPriceDraftRef.current = nextMaxPriceInput;
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
    const nextFeatureFilters = featureFilters.includes(normalizedFeature)
      ? featureFilters.filter((value) => value !== normalizedFeature)
      : [...featureFilters, normalizedFeature];
    setFeatureFilters(nextFeatureFilters);
    applyFilterMenuSearch({ nextFeatureFilters });
  };

  const handleFilterMenuListingTypeChange = (nextListingType) => {
    const normalizedListingType = sanitizeListingType(nextListingType);
    setListingType(normalizedListingType);
    applyFilterMenuSearch({ nextListingType: normalizedListingType });
  };

  const handleFilterMenuRoomsChange = (nextRooms) => {
    const normalizedRooms = String(nextRooms || '').trim();
    setRooms(normalizedRooms);
    setRoomsDraft(normalizedRooms);
    applyFilterMenuSearch({ nextRooms: normalizedRooms });
  };

  const handleFilterMenuBathsChange = (nextBaths) => {
    const normalizedBaths = String(nextBaths || '').trim();
    setBaths(normalizedBaths);
    setBathsDraft(normalizedBaths);
    applyFilterMenuSearch({ nextBaths: normalizedBaths });
  };

  const handleClearAllFilters = () => {
    setRooms('');
    setBaths('');
    setRoomsDraft('');
    setBathsDraft('');
    setListingType('all');
    setPropertyCategory('');
    setFeatureFilters([]);
    setMinPriceInput(PRICE_SLIDER_MIN);
    setMaxPriceInput(PRICE_SLIDER_MAX);
    minPriceDraftRef.current = PRICE_SLIDER_MIN;
    maxPriceDraftRef.current = PRICE_SLIDER_MAX;
    setFiltersExpanded(false);
    applySearch({
      nextRooms: '',
      nextBaths: '',
      nextListingType: 'all',
      nextPropertyCategory: '',
      nextFeatureFilters: [],
      nextMinPriceInput: PRICE_SLIDER_MIN,
      nextMaxPriceInput: PRICE_SLIDER_MAX,
    });
  };

  const hasCustomPrice = minPriceInput > PRICE_SLIDER_MIN || maxPriceInput < PRICE_SLIDER_MAX;
  const roomOptions = useMemo(() => ROOM_OPTION_VALUES.map((value) => {
    if (value === '') return { value: '', label: t('common.any') };
    if (value === 'studio') return { value: 'studio', label: t('navbar.studio') };
    return { value, label: value };
  }), [t]);
  const bathOptions = useMemo(() => BATH_OPTION_VALUES.map((value) => ({
    value,
    label: value === '' ? t('common.any') : value,
  })), [t]);
  const roomsBathsSummaryLabel = getRoomsBathsSummaryLabel({
    rooms,
    baths,
    roomOptions,
    bathOptions,
    t,
  });
  const interestSummary = useMemo(() => getInterestSummary(), [interestVersion]);
  const likedCount = (interestSummary.favoriteIds || []).length;
  const userFirstName = getUserFirstName(user);
  const shouldShowGreeting = isAuthenticated && Boolean(userFirstName);
  const isListingsRoute = location.pathname === '/';
  const alertsOverlayTarget = useMemo(() => {
    const params = new URLSearchParams(location.pathname === '/' ? location.search : '');
    params.set('alerts', '1');
    const serialized = params.toString();
    return {
      pathname: '/',
      search: serialized ? `?${serialized}` : '?alerts=1',
    };
  }, [location.pathname, location.search]);
  const loginForSaveSearchTarget = useMemo(() => {
    const params = new URLSearchParams();
    params.set('intent', SAVE_SEARCH_AUTH_INTENT);
    const redirectPath = `${location.pathname || '/'}${location.search || ''}`;
    params.set('redirect', redirectPath.startsWith('/') ? redirectPath : '/');
    const serialized = params.toString();
    return {
      pathname: '/login',
      search: serialized ? `?${serialized}` : '',
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAuthenticated || !isListingsRoute) return;
    if (window.sessionStorage.getItem(SAVE_SEARCH_AFTER_AUTH_SESSION_KEY) !== '1') return;
    window.sessionStorage.removeItem(SAVE_SEARCH_AFTER_AUTH_SESSION_KEY);
    if (deferredAutoSaveTimerRef.current) {
      window.clearTimeout(deferredAutoSaveTimerRef.current);
    }
    setIsSavingSearch(true);
    setSaveSearchStatus('Saving...');
    deferredAutoSaveTimerRef.current = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('homekey:save-current-search'));
      deferredAutoSaveTimerRef.current = null;
    }, 180);
  }, [isAuthenticated, isListingsRoute]);

  const handleSaveCurrentSearch = () => {
    if (!isListingsRoute || isSavingSearch) return;
    if (!isAuthenticated) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(SAVE_SEARCH_AFTER_AUTH_SESSION_KEY, '1');
      }
      history.push(loginForSaveSearchTarget);
      return;
    }
    setIsSavingSearch(true);
    setSaveSearchStatus('saving');
    window.dispatchEvent(new CustomEvent('homekey:save-current-search'));
  };

  const handleLogoutFromGreeting = () => {
    logout();
    history.push('/');
  };

  const likedStateMessage = likedOnly
    ? t('navbar.likedOnlyStateMessage')
    : t('navbar.allListingsStateMessage');
  const likedAriaLabel = t('navbar.likedAriaLabel', {
    count: likedCount,
    stateMessage: likedStateMessage,
  });
  const saveSearchButtonLabel = !isAuthenticated
    ? t('navbar.signInToSave')
    : (isSavingSearch
      ? t('navbar.saveSearchSaving')
      : (saveSearchStatus === 'saved'
        ? t('navbar.saveSearchSaved')
        : (saveSearchStatus === 'failed' ? t('navbar.saveSearchFailed') : t('navbar.saveSearch'))));
  const languageTarget = language === 'he' ? 'English' : 'עברית';
  const isHebrew = language === 'he';
  const homeKeyBrand = t('brand.homeKey');
  const hasAdvancedFilters = listingType !== 'all' || Boolean(propertyCategory) || featureFilters.length > 0;

  return (
    <nav className="premium-header" aria-label={t('navbar.propertySearchAriaLabel')}>
      <div className="premium-header__inner">
        <div className="premium-header__brand-cell">
          <Link
            to="/"
            className="premium-header__brand"
            aria-label={t('navbar.homeAriaLabel', { brand: homeKeyBrand })}
          >
            <img className="premium-header__brand-image" src={homeKeyWordmark} alt={`${homeKeyBrand} logo`} />
          </Link>
        </div>

        <div className="premium-header__search-cell">
          <form className="premium-header__search-form" onSubmit={handleHeaderSearchSubmit}>
            <div className="premium-header__search-pill" role="group" aria-label={t('navbar.propertySearchAriaLabel')}>
              <div className="premium-header__search-segment premium-header__search-segment--location">
                <input
                  id="header-search-query"
                  type="text"
                  placeholder={t('navbar.searchPlaceholder')}
                  className={city.trim() ? 'is-active' : ''}
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  onBlur={(event) => applySearch({ nextCity: event.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="premium-header__search-segment premium-header__search-segment--voice">
                <button
                  type="button"
                  className={`premium-header__voice-toggle ${isVoiceListening ? 'is-listening' : ''}`}
                  aria-label={isVoiceListening ? t('navbar.voiceSearchStopAriaLabel') : t('navbar.voiceSearchAriaLabel')}
                  onClick={handleMobileVoiceSearch}
                >
                  <span>{t('navbar.voiceSearch')}</span>
                </button>
              </div>
              <div className="premium-header__search-segment premium-header__search-segment--ai">
                <button
                  type="button"
                  className={`premium-header__ai-toggle ${city.trim() ? 'is-active' : ''}`}
                  aria-label={t('navbar.aiSearchAriaLabel')}
                  onClick={handleMobileAiSearch}
                  disabled={!city.trim()}
                >
                  <span>{t('navbar.aiSearch')}</span>
                </button>
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
                  <span>{t('navbar.price')}</span>
                </button>
                <div
                  id="header-price-slider-panel"
                  className={`premium-header__price-panel ${priceExpanded ? 'is-open' : ''}`}
                >
                  <div className="premium-header__price-values" aria-hidden="true">
                    <span>{formatPriceSliderLabel(minPriceInput, false, locale)}</span>
                    <span>—</span>
                    <span>{formatPriceSliderLabel(maxPriceInput, true, locale)}</span>
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
                      aria-label={t('navbar.minimumPriceAriaLabel')}
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
                      aria-label={t('navbar.maximumPriceAriaLabel')}
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
                    <p className="premium-header__rooms-section-title">{t('navbar.bedrooms')}</p>
                    <div className="premium-header__rooms-options-grid">
                      {roomOptions.map((option) => (
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
                    <p className="premium-header__rooms-section-title">{t('navbar.bathrooms')}</p>
                    <div className="premium-header__rooms-options-grid premium-header__rooms-options-grid--baths">
                      {bathOptions.map((option) => (
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
                      {t('navbar.clearSelections')}
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
                      {t('navbar.done')}
                    </button>
                  </div>
                </div>
              </div>
              <div className="premium-header__search-segment premium-header__search-segment--all-filters" ref={filtersRef}>
                <button
                  id="header-search-filter-toggle"
                  type="button"
                  className={`premium-header__filters-toggle ${hasAdvancedFilters ? 'is-active' : ''}`}
                  onClick={() => {
                    setPriceExpanded(false);
                    setRoomsBathsExpanded(false);
                    setFiltersExpanded((value) => !value);
                  }}
                  aria-expanded={filtersExpanded}
                  aria-controls="header-filters-panel"
                >
                  <span>{t('navbar.allFilters')}</span>
                </button>
                <div
                  id="header-filters-panel"
                  ref={filtersPanelRef}
                  className={`premium-header__filters-panel ${filtersExpanded ? 'is-open' : ''} is-mobile-sheet`}
                >
                  <FilterMenu
                    onClearAllFilters={handleClearAllFilters}
                    listingType={listingType}
                    roomOptions={roomOptions}
                    bathOptions={bathOptions}
                    rooms={rooms}
                    baths={baths}
                    minPrice={minPriceInput}
                    maxPrice={maxPriceInput}
                    propertyCategory={propertyCategory}
                    selectedFeatures={featureFilters}
                    onListingTypeChange={handleFilterMenuListingTypeChange}
                    onRoomsChange={handleFilterMenuRoomsChange}
                    onBathsChange={handleFilterMenuBathsChange}
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
                    {t('navbar.showResults')}
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
            {voiceSearchStatus && (
              <p className="premium-header__voice-status" aria-live="polite">
                {voiceSearchStatus}
              </p>
            )}
            <button type="submit" className="premium-header__search-submit" aria-label={t('navbar.applySearchAriaLabel')}>
              {t('navbar.search')}
            </button>
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
            aria-label={likedAriaLabel}
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
              <span>{t('navbar.likedCount', { count: likedCount })}</span>
            </div>
          </button>
        </div>

        <div className={`premium-header__actions premium-header__actions-cell${isHebrew ? ' premium-header__actions--hebrew' : ''}`}>
          {isHebrew ? (
            <>
              <button
                className="premium-header__language-toggle"
                type="button"
                aria-label={t('navbar.languageToggleAriaLabel', { targetLanguage: languageTarget })}
                title={t('navbar.languageToggleAriaLabel', { targetLanguage: languageTarget })}
                onClick={toggleLanguage}
              >
                <span className="premium-header__language-text">{languageTarget}</span>
              </button>
              <Link to="/add-listing" className="premium-header__cta premium-header__action-pill">{t('navbar.listProperty')}</Link>
              {isListingsRoute && (
                <button
                  type="button"
                  className={`premium-header__save-search-btn premium-header__action-pill ${saveSearchStatus === 'saved' ? 'is-success' : ''}`}
                  onClick={handleSaveCurrentSearch}
                  disabled={isSavingSearch}
                >
                  {saveSearchButtonLabel}
                </button>
              )}
              <span className="premium-header__actions-utility">
                <Link to={isAuthenticated ? alertsOverlayTarget : '/login'} className="premium-header__alerts-link">
                  {t('navbar.savedSearch')}
                </Link>
                {isAuthenticated && (
                  <Link to="/account" className="premium-header__alerts-link">
                    {t('navbar.myAccount')}
                  </Link>
                )}
                {shouldShowGreeting ? (
                  <button
                    type="button"
                    className="premium-header__greeting"
                    aria-label={t('navbar.logoutAriaLabel', { name: userFirstName })}
                    title={t('navbar.logoutAriaLabel', { name: userFirstName })}
                    onClick={handleLogoutFromGreeting}
                  >
                    <span className="premium-header__greeting-label">{t('navbar.hello')}</span>
                    <span className="premium-header__greeting-name">{userFirstName}</span>
                  </button>
                ) : (
                  <Link to="/login" className="premium-header__login">{t('navbar.login')}</Link>
                )}
              </span>
            </>
          ) : (
            <>
              {isListingsRoute && (
                <button
                  type="button"
                  className={`premium-header__save-search-btn premium-header__action-pill ${saveSearchStatus === 'saved' ? 'is-success' : ''}`}
                  onClick={handleSaveCurrentSearch}
                  disabled={isSavingSearch}
                >
                  {saveSearchButtonLabel}
                </button>
              )}
              <button
                className="premium-header__language-toggle"
                type="button"
                aria-label={t('navbar.languageToggleAriaLabel', { targetLanguage: languageTarget })}
                title={t('navbar.languageToggleAriaLabel', { targetLanguage: languageTarget })}
                onClick={toggleLanguage}
              >
                <span className="premium-header__language-text">{languageTarget}</span>
              </button>
              <Link to="/add-listing" className="premium-header__cta premium-header__action-pill">{t('navbar.listProperty')}</Link>
              <Link to={isAuthenticated ? alertsOverlayTarget : '/login'} className="premium-header__alerts-link">
                {t('navbar.savedSearch')}
              </Link>
              {isAuthenticated && (
                <Link to="/account" className="premium-header__alerts-link">
                  {t('navbar.myAccount')}
                </Link>
              )}
              {shouldShowGreeting ? (
                <button
                  type="button"
                  className="premium-header__greeting"
                  aria-label={t('navbar.logoutAriaLabel', { name: userFirstName })}
                  title={t('navbar.logoutAriaLabel', { name: userFirstName })}
                  onClick={handleLogoutFromGreeting}
                >
                  <span className="premium-header__greeting-label">{t('navbar.hello')}</span>
                  <span className="premium-header__greeting-name">{userFirstName}</span>
                </button>
              ) : (
                <Link to="/login" className="premium-header__login">{t('navbar.login')}</Link>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
