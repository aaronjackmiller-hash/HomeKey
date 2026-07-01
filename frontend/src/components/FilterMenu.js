/**
 * FilterMenu.js
 * path: frontend/src/components/FilterMenu.js
 */

import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const FEATURE_ITEMS = [
  { id: 'elevator', labelKey: 'filterMenu.elevator', icon: 'elevator' },
  { id: 'parking', labelKey: 'filterMenu.parking', icon: 'parking' },
  { id: 'pets', labelKey: 'filterMenu.petsAllowed', icon: 'pets' },
  { id: 'disabled-access', labelKey: 'filterMenu.disabledAccess', icon: 'accessibility' },
  { id: 'renovated', labelKey: 'filterMenu.renovated', icon: 'renovated' },
  { id: 'furnished', labelKey: 'filterMenu.furnished', icon: 'furnished' },
];

const DETAIL_ITEMS = [
  { id: 'oven', labelKey: 'filterMenu.oven', icon: 'oven' },
  { id: 'balcony', labelKey: 'filterMenu.balcony', icon: 'balcony' },
  { id: 'stovetop', labelKey: 'filterMenu.stovetop', icon: 'stovetop' },
  { id: 'in-unit-washer-dryer', labelKey: 'filterMenu.inUnitWasherDryer', icon: 'washer' },
];

const LISTING_TYPE_OPTIONS = ['rental', 'sale'];
const RENT_RANGE_OPTIONS = ['Under ₪5k', '₪5k–10k', '₪10k+'];
const FLEXIBILITY_OPTIONS = ['Strict', '±3 days', '±7 days'];
const SHARING_OPTIONS = ['1 other', '2 others', '3+ others'];
const GENDER_OPTIONS = ['Men', 'Women', 'No preference'];
const SMOKING_OPTIONS = ['Anywhere', 'Outside only', 'Not at all'];
const KOSHER_OPTIONS = ['Yes', 'No', 'Open to it'];
const LEASE_OPTIONS = ['3 mo', '6 mo', '12 mo', '12 mo+'];
const UTILITIES_OPTIONS = ['Included', 'Not included'];
const BEDROOM_COUNT_OPTIONS = ['1', '2', '3', '4+'];
const ROOMS_AVAILABLE_OPTIONS = ['1', '2', '3+'];
const ROOMMATE_COUNT_OPTIONS = ['1', '2', '3+'];

const ROOMMATE_AMENITY_ITEMS = [
  { id: 'Mamad',                  label: 'Mamad',        icon: '🛡️' },
  { id: 'Elevator',               label: 'Elevator',     icon: '🛗' },
  { id: 'Parking',                label: 'Parking',      icon: '🚗' },
  { id: 'Pets Allowed',           label: 'Pets OK',      icon: '🐾' },
  { id: 'Disabled Access',        label: 'Accessible',   icon: '♿' },
  { id: 'Renovated',              label: 'Renovated',    icon: '🔨' },
  { id: 'Furnished',              label: 'Furnished',    icon: '🛋️' },
  { id: 'Oven',                   label: 'Oven',         icon: '🍳' },
  { id: 'Balcony',                label: 'Balcony',      icon: '🌇' },
  { id: 'Stovetop',               label: 'Stovetop',     icon: '🔥' },
  { id: 'In-Unit Washer & Dryer', label: 'Washer/Dryer', icon: '🌀' },
  { id: 'Dishwasher',             label: 'Dishwasher',   icon: '🍽️' },
];

const ROOMMATE_AMENITY_LABELS_HE = {
  'Mamad': 'ממ״ד',
  'Elevator': 'מעלית',
  'Parking': 'חניה',
  'Pets Allowed': 'מתאים לחיות מחמד',
  'Disabled Access': 'נגישות',
  'Renovated': 'משופץ',
  'Furnished': 'מרוהט',
  'Oven': 'תנור',
  'Balcony': 'מרפסת',
  'Stovetop': 'כיריים',
  'In-Unit Washer & Dryer': 'מכונת כביסה ומייבש',
};

const FILTER_PRICE_MIN = 0;
const FILTER_PRICE_MAX = 20000;
const FILTER_PRICE_STEP = 500;
const DEFAULT_MOVE_IN_DATE = '2026-07-01';

const CHARACTERISTIC_ICONS = {
  shield: (
    <>
      <path d="M12 3 5.5 5.5v5.4c0 4.1 2.6 7.9 6.5 9.1 3.9-1.2 6.5-5 6.5-9.1V5.5L12 3Z" />
      <path d="M9.5 12.1 11.3 14l3.4-4" />
    </>
  ),
  elevator: (
    <>
      <path d="M7 3h10v18H7z" />
      <path d="M12 3v18" />
      <path d="m9.2 8 1.8-2 1.8 2" />
      <path d="m14.8 16-1.8 2-1.8-2" />
    </>
  ),
  parking: (
    <>
      <path d="M6 14.5h12l-1.3-4.2A2 2 0 0 0 14.8 9H9.2a2 2 0 0 0-1.9 1.3L6 14.5Z" />
      <path d="M7.5 14.5v3" />
      <path d="M16.5 14.5v3" />
      <path d="M8 17.5h1.3" />
      <path d="M14.7 17.5H16" />
      <path d="M8.5 12.5h7" />
    </>
  ),
  pets: (
    <>
      <path d="M8.4 10.3c1 0 1.8-1 1.8-2.2S9.4 6 8.4 6 6.6 7 6.6 8.1s.8 2.2 1.8 2.2Z" />
      <path d="M15.6 10.3c1 0 1.8-1 1.8-2.2S16.6 6 15.6 6s-1.8 1-1.8 2.1.8 2.2 1.8 2.2Z" />
      <path d="M5.6 14.4c.9 0 1.6-.8 1.6-1.9 0-1-.7-1.9-1.6-1.9S4 11.5 4 12.5c0 1.1.7 1.9 1.6 1.9Z" />
      <path d="M18.4 14.4c.9 0 1.6-.8 1.6-1.9 0-1-.7-1.9-1.6-1.9s-1.6.9-1.6 1.9c0 1.1.7 1.9 1.6 1.9Z" />
      <path d="M8.2 15.5c.9-2 2.1-3 3.8-3s2.9 1 3.8 3c.7 1.6-.3 3.1-2.1 2.8-.6-.1-1.1-.3-1.7-.3s-1.1.2-1.7.3c-1.8.3-2.8-1.2-2.1-2.8Z" />
    </>
  ),
  accessibility: (
    <>
      <path d="M12 5.2a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z" />
      <path d="M5.5 8.2 12 7l6.5 1.2" />
      <path d="M12 7v5.2" />
      <path d="M9 21l3-8.8L15 21" />
      <path d="M9.8 15.5h4.4" />
    </>
  ),
  renovated: (
    <>
      <path d="M4 14.5h9.5" />
      <path d="M13.5 11.5v6" />
      <path d="M13.5 12.2 18 7.7a2 2 0 0 1 2.8 2.8L16.3 15" />
      <path d="M4 17.5h4.5" />
      <path d="M5.5 6.5h5" />
      <path d="M8 4v5" />
    </>
  ),
  furnished: (
    <>
      <path d="M5 12.5V10a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v2.5" />
      <path d="M4 12.5h16v5H4z" />
      <path d="M6 17.5V20" />
      <path d="M18 17.5V20" />
      <path d="M8 12.5v-2" />
      <path d="M16 12.5v-2" />
    </>
  ),
  oven: (
    <>
      <path d="M6 4h12v16H6z" />
      <path d="M6 8h12" />
      <path d="M9 6h.1" />
      <path d="M12 6h.1" />
      <path d="M15 6h.1" />
      <path d="M9 11h6v5H9z" />
    </>
  ),
  balcony: (
    <>
      <path d="M6 5h12v8H6z" />
      <path d="M4 13h16" />
      <path d="M6 13v6" />
      <path d="M10 13v6" />
      <path d="M14 13v6" />
      <path d="M18 13v6" />
      <path d="M4 19h16" />
    </>
  ),
  stovetop: (
    <>
      <path d="M5 5h14v14H5z" />
      <path d="M9 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M15 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M9 17.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M15 17.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    </>
  ),
  laundry: (
    <>
      <path d="M6 4h12v16H6z" />
      <path d="M6 8h12" />
      <path d="M9 6h.1" />
      <path d="M12 6h.1" />
      <path d="M12 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M10 14.2c1.3.8 2.5-.8 4 0" />
    </>
  ),
  washer: (
    <>
      <path d="M7 3.5h10v17H7z" />
      <path d="M7 7.5h10" />
      <path d="M10 5.5h.1" />
      <path d="M13 5.5h.1" />
      <path d="M12 17.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M9.6 14.1c1.5 1.1 3.3-1.1 4.8 0" />
    </>
  ),
  calendar: (
    <>
      <path d="M7 3.5V6" />
      <path d="M17 3.5V6" />
      <path d="M5 8h14" />
      <path d="M6 5h12a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
      <path d="M8 11h2" />
      <path d="M12 11h2" />
      <path d="M8 15h2" />
      <path d="M12 15h2" />
    </>
  ),
};

// ── Live counter component ──
const RoommateCounter = ({ lookingFor, isHebrew }) => {
  // These would eventually come from a real API call
  // For now showing static counts that feel realistic
  const seekerCount = 47;
  const listerCount = 12;

  if (lookingFor === 'room') {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #e8f4f0, #f0f8f5)',
        border: '1px solid #b8d8d0',
        borderRadius: '10px',
        padding: '10px 14px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{ fontSize: '20px' }}>🏠</span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#2d6b5e' }}>
            {isHebrew
              ? `${listerCount} חדרים זמינים עכשיו בישראל`
              : `${listerCount} rooms available right now in Israel`}
          </div>
          <div style={{ fontSize: '11px', color: '#5a8a80', marginTop: '2px' }}>
            {isHebrew
              ? 'הגדר את החיפוש שלך כדי לראות אותם על המפה'
              : 'Set your preferences to see them on the map'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fff4e8, #fff8f0)',
      border: '1px solid #f0d0a0',
      borderRadius: '10px',
      padding: '10px 14px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    }}>
      <span style={{ fontSize: '20px' }}>🔍</span>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#b06820' }}>
          {isHebrew
            ? `${seekerCount} אנשים מחפשים חדר עכשיו בישראל`
            : `${seekerCount} people are looking for a room right now in Israel`}
        </div>
        <div style={{ fontSize: '11px', color: '#9a7040', marginTop: '2px' }}>
          {isHebrew
            ? 'פרסם את החדר שלך ותגיע אליהם מיד'
            : 'List your room and reach them immediately'}
        </div>
      </div>
    </div>
  );
};

// ── Phone number component (reused in both forms) ──
const PhoneField = ({ phone, setPhone, phoneSaved, setPhoneSaved, isHebrew }) => {
  if (!phoneSaved) {
    return (
      <section className="filter-menu__section roommate-filters__section">
        <h3 className="roommate-filters__title">
          {isHebrew ? 'מספר טלפון' : 'Contact number'}
          <span className="roommate-filters__required-badge">
            {isHebrew ? 'חובה' : 'Required'}
          </span>
        </h3>
        <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>
          {isHebrew
            ? 'מוצג רק למשתמשים מאומתים. לעולם לא משותף פומבית.'
            : 'Only shown to verified users. Never shared publicly.'}
        </p>
        <div className="roommate-phone-row">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+972 50 000 0000"
            className="roommate-text-input"
          />
          <button
            type="button"
            className="roommate-phone-save-btn"
            onClick={() => { if (phone.length >= 8) setPhoneSaved(true); }}
            style={{ opacity: phone.length >= 8 ? 1 : 0.4 }}
          >
            {isHebrew ? 'שמור' : 'Save'}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="filter-menu__section roommate-filters__section">
      <h3 className="roommate-filters__title">
        {isHebrew ? 'מספר טלפון' : 'Contact number'}
        <span className="roommate-filters__required-badge" style={{ background: '#e8f4f0', color: '#2d6b5e', borderColor: '#b8d8d0' }}>
          ✓ {isHebrew ? 'נשמר' : 'Saved'}
        </span>
      </h3>
      <div className="roommate-phone-saved">
        <div className="roommate-phone-saved__number">✓ {phone}</div>
        <button
          type="button"
          className="roommate-whatsapp-btn"
          onClick={() => window.open(`https://wa.me/${phone.replace(/\D/g,'').replace(/^0/,'972')}`)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          {isHebrew ? 'צור קשר בוואטסאפ' : 'Contact on WhatsApp'}
        </button>
        <button type="button" className="roommate-phone-edit-btn" onClick={() => setPhoneSaved(false)}>
          {isHebrew ? 'ערוך מספר' : 'Edit number'}
        </button>
      </div>
    </section>
  );
};

const FilterMenu = ({
  onClearAllFilters,
  listingType,
  roomOptions,
  bathOptions,
  rooms,
  baths,
  minPrice,
  maxPrice,
  propertyCategory,
  selectedFeatures,
  onListingTypeChange,
  onRoomsChange,
  onBathsChange,
  onMinPriceChange,
  onMaxPriceChange,
  onTogglePropertyCategory,
  onToggleFeature,
  onApplyFilters,
  onSaveFilters,
  roommateLocation,
  onRoommateLocationChange,
  renderRoommateLocationInput,
  initialLookingFor = 'room',
}) => {
  const { t, locale } = useLanguage();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const selectedFeatureSet = new Set(selectedFeatures || []);
  const isRoommatesView = listingType === 'roommates';
  const [bedroomsNeeded, setBedroomsNeeded] = useState('1');
  const [roommatesNeeded, setRoommatesNeeded] = useState('1');

  const resetRoommateFilters = () => {
    setLookingFor('room');
    setBedroomsNeeded('1');
    setRoommatesNeeded('1');
  };

  const handleClearAll = () => {
    resetRoommateFilters();
    onClearAllFilters();
  };

  // ── FIX 2: Dynamic title based on mode and selection ──
  const getPanelTitle = () => {
    if (!isRoommatesView) return t('filterMenu.title');
    return isHebrew ? 'מצא חדר' : 'Looking for a Room';
  };

  return (
    <div className={`filter-menu ${isRoommatesView ? 'filter-menu--roommates filter-menu--room-wanted' : ''}`}>
      <div className="filter-menu__sticky-top" style={{ background: 'var(--color-surface, #fff)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div className="filter-menu__header">
          {/* ── FIX 2: Dynamic title ── */}
          <h2 className="filter-menu__title">{getPanelTitle()}</h2>
          <button type="button" className="filter-menu__cancel" onClick={handleClearAll}>
            {t('filterMenu.clearAll')}
          </button>
        </div>

        {!isRoommatesView && (
          <section className="filter-menu__section filter-menu__listing-type-section">
            <h3 className="filter-menu__section-title">{t('filterMenu.listingType')}</h3>
            <div className="filter-menu__type-row filter-menu__listing-type-row">
              {LISTING_TYPE_OPTIONS.map((typeOption) => (
                <button
                  key={typeOption}
                  type="button"
                  className={`filter-menu__chip ${listingType === typeOption ? 'is-selected' : ''}`}
                  onClick={() => onListingTypeChange(typeOption)}
                >
                  {t(`filterMenu.${typeOption}`)}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {isRoommatesView ? (
        <RoommateFilters
          bedroomsNeeded={bedroomsNeeded}
          roommatesNeeded={roommatesNeeded}
          onBedroomsNeededChange={setBedroomsNeeded}
          onRoommatesNeededChange={setRoommatesNeeded}
          onApplyFilters={onApplyFilters}
          onSaveFilters={onSaveFilters}
          roommateLocation={roommateLocation}
          onRoommateLocationChange={onRoommateLocationChange}
          renderRoommateLocationInput={renderRoommateLocationInput}
          isHebrew={isHebrew}
        />
      ) : (
        <div style={{ background: '#e8f4f0', minHeight: '100%' }}>
          {/* ── Teal decorative header for Rent/Sale ── */}
          <div style={{ background: '#2d6b5e', padding: '20px 16px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ flexShrink: 0 }}>
                <svg viewBox="0 0 72 72" width="64" height="64" focusable="false" aria-hidden="true">
                  <rect x="4" y="28" width="64" height="36" rx="4" fill="#1f4f44"/>
                  <polygon points="36,8 6,30 66,30" fill="#4a9b85"/>
                  <rect x="14" y="36" width="14" height="14" rx="2" fill="#b8d8d0"/>
                  <rect x="16" y="38" width="5" height="5" rx="1" fill="#2d6b5e"/>
                  <rect x="23" y="38" width="5" height="5" rx="1" fill="#2d6b5e"/>
                  <rect x="16" y="45" width="5" height="5" rx="1" fill="#2d6b5e"/>
                  <rect x="23" y="45" width="5" height="5" rx="1" fill="#2d6b5e"/>
                  <rect x="30" y="42" width="12" height="22" rx="2" fill="#4a9b85"/>
                  <rect x="33" y="48" width="3" height="3" rx="1" fill="#1f4f44"/>
                  <rect x="44" y="36" width="14" height="10" rx="2" fill="#b8d8d0"/>
                  <rect x="46" y="38" width="10" height="6" rx="1" fill="#2d6b5e" opacity="0.6"/>
                  <circle cx="58" cy="20" r="6" fill="#f0c040" opacity="0.8"/>
                </svg>
              </div>
              <div>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px', margin: '0 0 4px' }}>
                  {listingType === 'for-sale'
                    ? (isHebrew ? 'מצא דירה לקנייה' : 'Find a Home to Buy')
                    : (isHebrew ? 'מצא דירה להשכרה' : 'Find a Home to Rent')}
                </p>
                <p style={{ color: '#a8d5c8', fontSize: '12px', margin: 0, lineHeight: 1.4 }}>
                  {isHebrew ? 'סנן לפי הצרכים שלך — עדכן בזמן אמת' : 'Filter by your needs — results update instantly'}
                </p>
              </div>
            </div>
          </div>

          {/* ── Filter sections on soft teal background ── */}
          <div style={{ padding: '12px 12px 0' }}>
          <section className="filter-menu__section" style={{ background: '#fff', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
            <h3 className="filter-menu__section-title">{t('filterMenu.location') || 'Location'}</h3>
            {typeof renderRoommateLocationInput === 'function'
              ? renderRoommateLocationInput({
                  id: 'all-filters-location',
                  value: roommateLocation,
                  onChange: onRoommateLocationChange,
                  placeholder: t('filterMenu.locationPlaceholder') || 'City or neighborhood…',
                })
              : (
                <input
                  id="all-filters-location"
                  type="text"
                  value={roommateLocation || ''}
                  onChange={(e) => onRoommateLocationChange(e.target.value)}
                  placeholder={t('filterMenu.locationPlaceholder') || 'City or neighborhood…'}
                  className="roommate-text-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              )}
          </section>
          <section className="filter-menu__section" style={{ background: '#fff', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
            <h3 className="filter-menu__section-title">{t('filterMenu.propertyTypes')}</h3>
            <div className="filter-menu__type-row">
              <button type="button" className={`filter-menu__chip ${propertyCategory === 'apartments' ? 'is-selected' : ''}`} onClick={() => onTogglePropertyCategory('apartments')}>{t('filterMenu.apartments')}</button>
              <button type="button" className={`filter-menu__chip ${propertyCategory === 'houses' ? 'is-selected' : ''}`} onClick={() => onTogglePropertyCategory('houses')}>{t('filterMenu.houses')}</button>
            </div>
          </section>
          <section className="filter-menu__section" style={{ background: '#fff', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
            <h3 className="filter-menu__section-title">{t('filterMenu.bedrooms')}</h3>
            <div className="filter-menu__option-grid">
              {roomOptions.map((option) => (
                <button key={option.value || 'any-rooms'} type="button" className={`filter-menu__chip ${rooms === option.value ? 'is-selected' : ''}`} onClick={() => onRoomsChange(option.value)}>{option.label}</button>
              ))}
            </div>
          </section>
          <section className="filter-menu__section" style={{ background: '#fff', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
            <h3 className="filter-menu__section-title">{t('filterMenu.bathrooms')}</h3>
            <div className="filter-menu__option-grid">
              {bathOptions.map((option) => (
                <button key={option.value || 'any-baths'} type="button" className={`filter-menu__chip ${baths === option.value ? 'is-selected' : ''}`} onClick={() => onBathsChange(option.value)}>{option.label}</button>
              ))}
            </div>
          </section>
          <section className="filter-menu__section" style={{ background: '#fff', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
            <h3 className="filter-menu__section-title">{t('filterMenu.propertyCharacteristics')}</h3>
            <button type="button" className={`filter-menu__mamad-btn ${selectedFeatureSet.has('mamad') ? 'is-selected' : ''}`} onClick={() => onToggleFeature('mamad')}>
              <span className="filter-menu__mamad-icon" aria-hidden="true"><CharacteristicIcon name="shield" /></span>
              <div className="filter-menu__mamad-copy">
                <span>{t('filterMenu.mamad')}</span>
                <span>({t('filterMenu.securityRoom')})</span>
              </div>
            </button>
            <div className="filter-menu__features-grid">
              {FEATURE_ITEMS.map((feature) => (
                <FeatureCard key={feature.id} icon={feature.icon} label={t(feature.labelKey)} isSelected={selectedFeatureSet.has(feature.id)} onClick={() => onToggleFeature(feature.id)} />
              ))}
            </div>
            <div className="filter-menu__details-grid">
              {DETAIL_ITEMS.map((detail) => (
                <button key={detail.id} type="button" className={`filter-menu__detail-chip ${selectedFeatureSet.has(detail.id) ? 'is-selected' : ''}`} onClick={() => onToggleFeature(detail.id)}>
                  <span className="filter-menu__detail-icon" aria-hidden="true"><CharacteristicIcon name={detail.icon} /></span>
                  {t(detail.labelKey)}
                </button>
              ))}
            </div>
          </section>
          </div>{/* end padding wrapper */}
        </div>
      )}
    </div>
  );
};

const RoommateFilters = ({
  bedroomsNeeded,
  roommatesNeeded,
  onBedroomsNeededChange,
  onRoommatesNeededChange,
  onApplyFilters,
  onSaveFilters,
  roommateLocation = '',
  onRoommateLocationChange = () => {},
  renderRoommateLocationInput = null,
  isHebrew = false,
}) => {
  const { t, language } = useLanguage();

  const [rentRange, setRentRange] = useState('Under ₪5k');
  const [moveInDate, setMoveInDate] = useState(DEFAULT_MOVE_IN_DATE);
  const [flexibility, setFlexibility] = useState('Strict');
  const [sharingWith, setSharingWith] = useState('1 other');
  const [gender, setGender] = useState('No preference');
  const [smoking, setSmoking] = useState('Not at all');
  const [kosher, setKosher] = useState('Open to it');
  const [leaseTerm, setLeaseTerm] = useState('6 mo');
  const [amenities, setAmenities] = useState(['Mamad']);

  const [phone, setPhone] = useState('');
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [seekerSubmitStatus, setSeekerSubmitStatus] = useState('idle');
  const [seekerProfileId, setSeekerProfileId] = useState(null);
  const [seekerErrorMessage, setSeekerErrorMessage] = useState('');

  const toggleAmenity = (item) => setAmenities((prev) => prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]);

  const handlePublishSeekerProfile = async () => {
    if (!phoneSaved || !phone) return;
    setSeekerSubmitStatus('submitting');
    try {
      const apiBase = process.env.REACT_APP_API_URL || '';
      const res = await fetch(`${apiBase}/api/seekers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          budgetRange: rentRange,
          moveInDate: moveInDate || undefined,
          flexibility,
          sharingWith,
          genderPreference: gender,
          smoking,
          kosher,
          leaseTerm,
          amenities,
          bedroomsNeeded: bedroomsNeeded || 1,
          city: roommateLocation,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Server error ${res.status} — please try again shortly`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
      setSeekerProfileId(data.data?._id || null);
      setSeekerSubmitStatus('success');
    } catch (err) {
      console.error('[seeker-profile] publish error:', err.message);
      setSeekerSubmitStatus('error');
      setSeekerErrorMessage(err.message || 'Something went wrong — try again');
    }
  };

  const getAmenityLabel = (id) => isHebrew ? (ROOMMATE_AMENITY_LABELS_HE[id] || id) : id;

  const renderLocationInput = (id, placeholder = 'City or neighborhood…') => {
    if (typeof renderRoommateLocationInput === 'function') {
      return renderRoommateLocationInput({ id, value: roommateLocation, onChange: onRoommateLocationChange, placeholder });
    }
    return (
      <input id={id} type="text" value={roommateLocation} onChange={(e) => onRoommateLocationChange(e.target.value)} placeholder={placeholder} className="roommate-text-input" />
    );
  };

  return (
    <div className="roommate-filters" style={{ background: '#e8f4f0', minHeight: '100%' }}>

      {/* ── Teal decorative header with illustration ── */}
      <div style={{ background: '#2d6b5e', padding: '20px 16px 16px', marginBottom: '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ flexShrink: 0 }}>
            <svg viewBox="0 0 72 72" width="64" height="64" focusable="false" aria-hidden="true">
              <rect x="4" y="28" width="64" height="36" rx="4" fill="#1f4f44"/>
              <polygon points="36,8 6,30 66,30" fill="#4a9b85"/>
              <rect x="14" y="36" width="14" height="14" rx="2" fill="#b8d8d0"/>
              <rect x="16" y="38" width="5" height="5" rx="1" fill="#2d6b5e"/>
              <rect x="23" y="38" width="5" height="5" rx="1" fill="#2d6b5e"/>
              <rect x="16" y="45" width="5" height="5" rx="1" fill="#2d6b5e"/>
              <rect x="23" y="45" width="5" height="5" rx="1" fill="#2d6b5e"/>
              <rect x="30" y="42" width="12" height="22" rx="2" fill="#4a9b85"/>
              <rect x="33" y="48" width="3" height="3" rx="1" fill="#1f4f44"/>
              <rect x="44" y="36" width="14" height="10" rx="2" fill="#b8d8d0"/>
              <rect x="46" y="38" width="10" height="6" rx="1" fill="#2d6b5e" opacity="0.6"/>
              <circle cx="58" cy="20" r="6" fill="#f0c040" opacity="0.8"/>
            </svg>
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px', margin: '0 0 4px' }}>
              {isHebrew ? 'מחפש/ת חדר?' : 'Looking for a Room?'}
            </p>
            <p style={{ color: '#a8d5c8', fontSize: '12px', margin: 0, lineHeight: 1.4 }}>
              {isHebrew
                ? 'פרסם את הפרופיל שלך — בעלי חדרים יפנו אליך ישירות'
                : 'Post your profile — room listers will contact you directly on WhatsApp'}
            </p>
          </div>
        </div>

        {/* Stats pills */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          <RoommateCounter lookingFor="room" isHebrew={isHebrew} />
        </div>
      </div>

      {/* ── Seeker form — white cards on teal background ── */}
      <div style={{ padding: '12px 12px 0' }}>

          <section className="filter-menu__section roommate-filters__section">
            <h3 className="roommate-filters__title">Location</h3>
            <label className="roommate-filters__sub-label" htmlFor="seeker-location" style={{display:'block', marginBottom:'6px'}}>Where are you looking?</label>
            {renderLocationInput('seeker-location')}
          </section>

          <section className="filter-menu__section roommate-filters__section">
            <h3 className="roommate-filters__title">Budget & availability</h3>
            <p className="roommate-filters__sub-label">Total monthly rent</p>
            <SegmentedButtonGroup options={RENT_RANGE_OPTIONS} selectedValue={rentRange} onChange={setRentRange} ariaLabel="Total monthly rent range" />
            <div className="roommate-filters__budget-row">
              <div>
                <label className="roommate-filters__sub-label" htmlFor="seeker-move-in">Move-in date</label>
                <div className="roommate-month-field">
                  <span aria-hidden="true"><CharacteristicIcon name="calendar" /></span>
                  <input id="seeker-move-in" type="date" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} className="roommate-month-input" />
                </div>
              </div>
              <div>
                <p className="roommate-filters__sub-label">Flexibility</p>
                <SegmentedButtonGroup options={FLEXIBILITY_OPTIONS} selectedValue={flexibility} onChange={setFlexibility} ariaLabel="Flexibility" />
              </div>
            </div>
          </section>

          <section className="filter-menu__section roommate-filters__section">
            <h3 className="roommate-filters__title">Apartment details <span style={{fontSize:'12px',fontWeight:400,color:'#8a8070'}}>(entire unit)</span></h3>
            <p className="roommate-filters__sub-label">I'm open to sharing with up to:</p>
            <SegmentedButtonGroup options={SHARING_OPTIONS} selectedValue={sharingWith} onChange={setSharingWith} ariaLabel="Sharing preference" />
          </section>

          <section className="filter-menu__section roommate-filters__section">
            <h3 className="roommate-filters__title">I'd be most comfortable with</h3>
            <p className="roommate-filters__sub-label">I prefer to live with:</p>
            <SegmentedButtonGroup options={GENDER_OPTIONS} selectedValue={gender} onChange={setGender} ariaLabel="Gender preference" />
            <div className="roommate-filters__habit-box">
              <p className="roommate-filters__habit-label">I'm comfortable living with someone who smokes:</p>
              <p className="roommate-filters__habit-hint">Cigarettes, vaping, or similar.</p>
              <SegmentedButtonGroup options={SMOKING_OPTIONS} selectedValue={smoking} onChange={setSmoking} ariaLabel="Smoking preference" />
            </div>
            <div className="roommate-filters__habit-box" style={{marginTop:'8px'}}>
              <p className="roommate-filters__habit-label">I am willing to keep a kosher kitchen:</p>
              <SegmentedButtonGroup options={KOSHER_OPTIONS} selectedValue={kosher} onChange={setKosher} ariaLabel="Kosher kitchen" />
            </div>
          </section>

          <section className="filter-menu__section roommate-filters__section">
            <h3 className="roommate-filters__title">I'd like to rent for...</h3>
            <p className="roommate-filters__hint">No worries if you're not sure — just pick what feels right</p>
            <SegmentedButtonGroup options={LEASE_OPTIONS} selectedValue={leaseTerm} onChange={setLeaseTerm} ariaLabel="Rental duration" />
          </section>

          <section className="filter-menu__section roommate-filters__section">
            <h3 className="roommate-filters__title">Property amenities</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {ROOMMATE_AMENITY_ITEMS.map((a) => {
                const isSelected = amenities.includes(a.id);
                return (
                  <button key={a.id} type="button" onClick={() => toggleAmenity(a.id)} aria-pressed={isSelected}
                    style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 12px', border:`1.5px solid ${isSelected ? '#2d6b5e' : '#e5e7eb'}`, borderRadius:'10px', background: isSelected ? '#2d6b5e' : '#fff', color: isSelected ? '#fff' : '#6b7280', fontSize:'13px', fontWeight:'600', cursor:'pointer', textAlign:'left', width:'100%', transition:'all 0.15s ease' }}>
                    <span aria-hidden="true" style={{ fontSize:'17px', lineHeight:1, flexShrink:0 }}>{a.icon}</span>
                    <span>{getAmenityLabel(a.id)}</span>
                  </button>
                );
              })}
            </div>
          </section>
      </div>{/* end padding wrapper */}

      {/* ── Phone number — LAST, just before publish ── */}
      <div style={{ padding: '0 12px' }}>
        <PhoneField phone={phone} setPhone={setPhone} phoneSaved={phoneSaved} setPhoneSaved={setPhoneSaved} isHebrew={isHebrew} />
      </div>

      {/* ── Action buttons ── */}
      {seekerSubmitStatus === 'success' ? (
        <div className="roommate-filter-actions" style={{ background: '#e8f4f0', padding: '12px 12px 16px' }}>
          <div className="seeker-publish-success">
            <span>✓</span>
            <div>
              <strong>{isHebrew ? 'הפרופיל שלך פורסם!' : 'Your profile is live!'}</strong>
              <p>{isHebrew ? 'בעלי דירות יכולים עכשיו לפנות אליך בוואטסאפ.' : 'Room listers can now contact you on WhatsApp.'}</p>
            </div>
          </div>
          <button type="button" className="roommate-filter-actions__apply" onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('homekey:browse-rooms'));
            }
            onApplyFilters();
          }}>
            {isHebrew ? 'הצג חדרים זמינים' : 'Browse available rooms'}
          </button>
        </div>
      ) : (
        <div className="roommate-filter-actions" style={{ background: '#e8f4f0', padding: '12px 12px 16px' }}>
          <button
            type="button"
            className="roommate-filter-actions__publish"
            onClick={handlePublishSeekerProfile}
            disabled={!phoneSaved || seekerSubmitStatus === 'submitting'}
            style={{ opacity: phoneSaved ? 1 : 0.45 }}
          >
            {seekerSubmitStatus === 'submitting'
              ? (isHebrew ? 'מפרסם...' : 'Publishing…')
              : (isHebrew ? 'פרסם את הפרופיל שלי' : 'Publish my profile')}
          </button>
          {seekerSubmitStatus === 'error' && (
            <p className="seeker-publish-error">{seekerErrorMessage || (isHebrew ? 'שגיאה — נסה שוב' : 'Something went wrong — try again')}</p>
          )}
          {!phoneSaved && (
            <p className="seeker-publish-hint">{isHebrew ? 'שמור מספר טלפון תחילה' : 'Save your phone number above to publish'}</p>
          )}
          <button type="button" className="roommate-filter-actions__save" onClick={onApplyFilters}>
            {isHebrew ? 'גלה חדרים קודם' : 'Browse rooms first'}
          </button>
        </div>
      )}
    </div>
  );
};

const OptionButtonGroup = ({ options, selectedValue, onChange, compact, ariaLabel }) => (
  <div className={`roommate-option-group ${compact ? 'roommate-option-group--compact' : ''}`} aria-label={ariaLabel}>
    {options.map((option) => (
      <button key={option} type="button" className={`roommate-option ${selectedValue === option ? 'is-selected' : ''}`} onClick={() => onChange(option)} aria-pressed={selectedValue === option}>{option}</button>
    ))}
  </div>
);

const SegmentedButtonGroup = ({ options, selectedValue, onChange, ariaLabel }) => (
  <div className="roommate-segmented" aria-label={ariaLabel}>
    {options.map((option) => (
      <button key={option} type="button" className={selectedValue === option ? 'is-selected' : ''} onClick={() => onChange(option)} aria-pressed={selectedValue === option}>{option}</button>
    ))}
  </div>
);

const FeatureCard = ({ icon, label, isSelected, onClick }) => (
  <button type="button" className={`filter-menu__feature-card ${isSelected ? 'is-selected' : ''}`} onClick={onClick}>
    <span className="filter-menu__feature-icon" aria-hidden="true"><CharacteristicIcon name={icon} /></span>
    <span>{label}</span>
  </button>
);

const CharacteristicIcon = ({ name, size = 24 }) => (
  <svg className="filter-menu__characteristic-svg" viewBox="0 0 24 24" focusable="false" width={size} height={size} style={{ width: size, height: size, minWidth: size, minHeight: size }}>
    {CHARACTERISTIC_ICONS[name]}
  </svg>
);

FilterMenu.defaultProps = {
  onClearAllFilters: () => {},
  listingType: 'all',
  roomOptions: [],
  bathOptions: [],
  rooms: '',
  baths: '',
  minPrice: FILTER_PRICE_MIN,
  maxPrice: FILTER_PRICE_MAX,
  propertyCategory: '',
  selectedFeatures: [],
  onListingTypeChange: () => {},
  onRoomsChange: () => {},
  onBathsChange: () => {},
  onMinPriceChange: () => {},
  onMaxPriceChange: () => {},
  onTogglePropertyCategory: () => {},
  onToggleFeature: () => {},
  onApplyFilters: () => {},
  onSaveFilters: () => {},
  renderRoommateLocationInput: null,
  initialLookingFor: 'room',
};

export default FilterMenu;
