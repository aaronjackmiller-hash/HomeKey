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
  { id: 'laundry-facilities', labelKey: 'filterMenu.laundryFacilities', icon: 'laundry' },
  { id: 'in-unit-washer-dryer', labelKey: 'filterMenu.inUnitWasherDryer', icon: 'washer' },
];

const LISTING_TYPE_OPTIONS = ['rental', 'sale', 'roommates'];
const ROOMMATE_COUNT_OPTIONS = ['1', '2', '3+'];
const ROOMMATE_GENDER_OPTIONS = ['Male', 'Female', 'Either', 'Non-Binary/Other'];
const ROOMMATE_SMOKING_OPTIONS = ['Smoker Ok', 'Non-Smoker Only'];
const ROOMMATE_FLEXIBILITY_OPTIONS = ['Strict', '±3 days', '±7 days'];
const ROOMMATE_AMENITY_ITEMS = [
  { id: 'Mamad', icon: 'shield' },
  { id: 'Elevator', icon: 'elevator' },
  { id: 'Parking', icon: 'parking' },
  { id: 'Pets Allowed', icon: 'pets' },
  { id: 'Disabled Access', icon: 'accessibility' },
  { id: 'Renovated', icon: 'renovated' },
  { id: 'Furnished', icon: 'furnished' },
  { id: 'Oven', icon: 'oven' },
  { id: 'Balcony', icon: 'balcony' },
  { id: 'Stovetop', icon: 'stovetop' },
  { id: 'Laundry Facilities', icon: 'laundry' },
  { id: 'In-Unit Washer & Dryer', icon: 'washer' },
];
const FILTER_PRICE_MIN = 0;
const FILTER_PRICE_MAX = 20000;
const FILTER_PRICE_STEP = 500;
const DEFAULT_MOVE_IN_MONTH = '2026-07';

const CHARACTERISTIC_ICONS = {
  'volume-off': (
    <>
      <path d="M11 5 6.8 8.5H4v7h2.8L11 19V5Z" />
      <path d="m17 9-5 5" />
      <path d="m12 9 5 5" />
    </>
  ),
  users: (
    <>
      <path d="M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M3 20c0-3 2.4-5.5 5.5-5.5S14 17 14 20" />
      <path d="M16 11a3 3 0 1 0 0-6" />
      <path d="M15 14.8c2.5.4 4 2.5 4 5.2" />
    </>
  ),
  briefcase: (
    <>
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M4 8h16v10.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5V8Z" />
      <path d="M4 12.5h16" />
      <path d="M10 12.5v1h4v-1" />
    </>
  ),
  moon: (
    <path d="M18.5 15.3A7.5 7.5 0 0 1 8.7 5.5 7.7 7.7 0 1 0 18.5 15.3Z" />
  ),
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
}) => {
  const { t, locale } = useLanguage();
  const selectedFeatureSet = new Set(selectedFeatures || []);
  const isRoommatesView = listingType === 'roommates';
  const [lookingFor, setLookingFor] = useState('room');
  const [bedroomsNeeded, setBedroomsNeeded] = useState('1');
  const [roommatesNeeded, setRoommatesNeeded] = useState('1');
  const [moveInDate, setMoveInDate] = useState(DEFAULT_MOVE_IN_MONTH);
  const [flexibility, setFlexibility] = useState('Strict');
  const [totalRoommates, setTotalRoommates] = useState('1');
  const [locationPreference, setLocationPreference] = useState('');
  const [gender, setGender] = useState('Male');
  const [smoking, setSmoking] = useState('Smoker Ok');
  const [kosher, setKosher] = useState(false);
  const [amenities, setAmenities] = useState(['Mamad']);

  const resetRoommateFilters = () => {
    setLookingFor('room');
    setBedroomsNeeded('1');
    setRoommatesNeeded('1');
    setMoveInDate(DEFAULT_MOVE_IN_MONTH);
    setFlexibility('Strict');
    setTotalRoommates('1');
    setLocationPreference('');
    setGender('Male');
    setSmoking('Smoker Ok');
    setKosher(false);
    setAmenities(['Mamad']);
  };

  const handleClearAll = () => {
    resetRoommateFilters();
    onClearAllFilters();
  };

  const toggleAmenity = (item) => {
    setAmenities((currentItems) => (
      currentItems.includes(item)
        ? currentItems.filter((currentItem) => currentItem !== item)
        : [...currentItems, item]
    ));
  };

  return (
    <div className={`filter-menu ${isRoommatesView ? 'filter-menu--roommates' : ''}`}>
      <div className="filter-menu__sticky-top">
        <div className="filter-menu__header">
          <h2 className="filter-menu__title">{t('filterMenu.title')}</h2>
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
          lookingFor={lookingFor}
          bedroomsNeeded={bedroomsNeeded}
          roommatesNeeded={roommatesNeeded}
          minPrice={minPrice}
          maxPrice={maxPrice}
          locale={locale}
          moveInDate={moveInDate}
          flexibility={flexibility}
          totalRoommates={totalRoommates}
          locationPreference={locationPreference}
          gender={gender}
          smoking={smoking}
          kosher={kosher}
          amenities={amenities}
          onLookingForChange={setLookingFor}
          onBedroomsNeededChange={setBedroomsNeeded}
          onRoommatesNeededChange={setRoommatesNeeded}
          onMinPriceChange={onMinPriceChange}
          onMaxPriceChange={onMaxPriceChange}
          onMoveInDateChange={setMoveInDate}
          onFlexibilityChange={setFlexibility}
          onTotalRoommatesChange={setTotalRoommates}
          onLocationPreferenceChange={setLocationPreference}
          onGenderChange={setGender}
          onSmokingChange={setSmoking}
          onKosherChange={setKosher}
          onAmenityToggle={toggleAmenity}
          onApplyFilters={onApplyFilters}
          onSaveFilters={onSaveFilters}
        />
      ) : (
        <>
          <section className="filter-menu__section">
            <h3 className="filter-menu__section-title">{t('filterMenu.propertyTypes')}</h3>
            <div className="filter-menu__type-row">
              <button
                type="button"
                className={`filter-menu__chip ${propertyCategory === 'apartments' ? 'is-selected' : ''}`}
                onClick={() => onTogglePropertyCategory('apartments')}
              >
                {t('filterMenu.apartments')}
              </button>
              <button
                type="button"
                className={`filter-menu__chip ${propertyCategory === 'houses' ? 'is-selected' : ''}`}
                onClick={() => onTogglePropertyCategory('houses')}
              >
                {t('filterMenu.houses')}
              </button>
            </div>
          </section>

          <section className="filter-menu__section">
            <h3 className="filter-menu__section-title">{t('filterMenu.bedrooms')}</h3>
            <div className="filter-menu__option-grid">
              {roomOptions.map((option) => (
                <button
                  key={option.value || 'any-rooms'}
                  type="button"
                  className={`filter-menu__chip ${rooms === option.value ? 'is-selected' : ''}`}
                  onClick={() => onRoomsChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="filter-menu__section">
            <h3 className="filter-menu__section-title">{t('filterMenu.bathrooms')}</h3>
            <div className="filter-menu__option-grid">
              {bathOptions.map((option) => (
                <button
                  key={option.value || 'any-baths'}
                  type="button"
                  className={`filter-menu__chip ${baths === option.value ? 'is-selected' : ''}`}
                  onClick={() => onBathsChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="filter-menu__section">
            <h3 className="filter-menu__section-title">{t('filterMenu.propertyCharacteristics')}</h3>
            <button
              type="button"
              className={`filter-menu__mamad-btn ${selectedFeatureSet.has('mamad') ? 'is-selected' : ''}`}
              onClick={() => onToggleFeature('mamad')}
            >
              <span className="filter-menu__mamad-icon" aria-hidden="true">
                <CharacteristicIcon name="shield" />
              </span>
              <div className="filter-menu__mamad-copy">
                <span>{t('filterMenu.mamad')}</span>
                <span>({t('filterMenu.securityRoom')})</span>
              </div>
            </button>
            <div className="filter-menu__features-grid">
              {FEATURE_ITEMS.map((feature) => (
                <FeatureCard
                  key={feature.id}
                  icon={feature.icon}
                  label={t(feature.labelKey)}
                  isSelected={selectedFeatureSet.has(feature.id)}
                  onClick={() => onToggleFeature(feature.id)}
                />
              ))}
            </div>
            <div className="filter-menu__details-grid">
              {DETAIL_ITEMS.map((detail) => (
                <button
                  key={detail.id}
                  type="button"
                  className={`filter-menu__detail-chip ${selectedFeatureSet.has(detail.id) ? 'is-selected' : ''}`}
                  onClick={() => onToggleFeature(detail.id)}
                >
                  <span className="filter-menu__detail-icon" aria-hidden="true">
                    <CharacteristicIcon name={detail.icon} />
                  </span>
                  {t(detail.labelKey)}
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const RoommateFilters = ({
  lookingFor,
  bedroomsNeeded,
  roommatesNeeded,
  minPrice,
  maxPrice,
  locale,
  moveInDate,
  flexibility,
  totalRoommates,
  locationPreference,
  gender,
  smoking,
  kosher,
  amenities,
  onLookingForChange,
  onBedroomsNeededChange,
  onRoommatesNeededChange,
  onMinPriceChange,
  onMaxPriceChange,
  onMoveInDateChange,
  onFlexibilityChange,
  onTotalRoommatesChange,
  onLocationPreferenceChange,
  onGenderChange,
  onSmokingChange,
  onKosherChange,
  onAmenityToggle,
  onApplyFilters,
  onSaveFilters,
}) => (
  <div className="roommate-filters">
    <section className="filter-menu__section roommate-filters__section">
      <h3 className="filter-menu__section-title">I am looking for:</h3>
      <div className="roommate-filters__looking-grid">
        <div
          role="button"
          tabIndex={0}
          className={`roommate-card ${lookingFor === 'room' ? 'is-selected' : ''}`}
          onClick={() => onLookingForChange('room')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onLookingForChange('room');
            }
          }}
          aria-pressed={lookingFor === 'room'}
        >
          <span className="roommate-card__illustration" aria-hidden="true">
            <svg viewBox="0 0 60 45" focusable="false">
              <rect x="21" y="8" width="21" height="28" rx="1.5" fill="#f7fafc" stroke="#4A5568" strokeWidth="1.4" />
              <path d="M27 36V20h11v16" fill="#f3d29b" stroke="#4A5568" strokeWidth="1.2" />
              <path d="M8 37h43" stroke="#4A5568" strokeWidth="1.2" />
              <path d="M15 37c0-7 5-10 5-10s5 3 5 10" fill="#7bbf8a" opacity="0.85" />
              <path d="M12 30c4 0 7 3 8 7" stroke="#2d5a27" strokeWidth="1.4" fill="none" />
              <path d="M24 29c-4 0-7 3-8 8" stroke="#2d5a27" strokeWidth="1.4" fill="none" />
            </svg>
          </span>
          <span className="roommate-card__title">Looking for a <strong>ROOM</strong></span>
          <span className="roommate-card__subtitle">(I need an apartment)</span>
          <span
            className="roommate-card__control"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <span className="roommate-card__control-label">Number of bedrooms needed:</span>
            <OptionButtonGroup
              options={ROOMMATE_COUNT_OPTIONS}
              selectedValue={bedroomsNeeded}
              onChange={(nextValue) => {
                onLookingForChange('room');
                onBedroomsNeededChange(nextValue);
              }}
              compact
              ariaLabel="Number of bedrooms needed"
            />
          </span>
        </div>

        <div
          role="button"
          tabIndex={0}
          className={`roommate-card ${lookingFor === 'roommate' ? 'is-selected' : ''}`}
          onClick={() => onLookingForChange('roommate')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onLookingForChange('roommate');
            }
          }}
          aria-pressed={lookingFor === 'roommate'}
        >
          <span className="roommate-card__illustration" aria-hidden="true">
            <svg viewBox="0 0 60 45" focusable="false">
              <circle cx="22" cy="15" r="7" fill="#4A5568" opacity="0.34" />
              <path d="M11 40 C11 30, 33 30, 33 40" fill="#2D5A27" opacity="0.42" />
              <circle cx="39" cy="16" r="7" fill="#4A5568" opacity="0.46" />
              <path d="M28 40 C28 31, 50 31, 50 40" fill="#4A5568" opacity="0.24" />
            </svg>
          </span>
          <span className="roommate-card__title">Looking for a <strong>ROOMMATE</strong></span>
          <span className="roommate-card__subtitle">(I have an apartment)</span>
          <span
            className="roommate-card__control"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <span className="roommate-card__control-label">Number of roommates needed:</span>
            <OptionButtonGroup
              options={ROOMMATE_COUNT_OPTIONS}
              selectedValue={roommatesNeeded}
              onChange={(nextValue) => {
                onLookingForChange('roommate');
                onRoommatesNeededChange(nextValue);
              }}
              compact
              ariaLabel="Number of roommates needed"
            />
          </span>
        </div>
      </div>
    </section>

    <section className="filter-menu__section roommate-filters__section">
      <h3 className="filter-menu__section-title">Budget & Availability</h3>
      <div className="roommate-filters__budget-grid">
        <BudgetRange
          minPrice={minPrice}
          maxPrice={maxPrice}
          locale={locale}
          onMinPriceChange={onMinPriceChange}
          onMaxPriceChange={onMaxPriceChange}
        />
        <div className="roommate-date-group">
          <label className="roommate-filters__field-title" htmlFor="roommate-move-in-date">Move-in Date</label>
          <input
            id="roommate-move-in-date"
            type="month"
            value={moveInDate}
            onChange={(event) => onMoveInDateChange(event.target.value)}
            className="roommate-month-input"
          />
          <p className="roommate-filters__field-title roommate-filters__field-title--compact">Flexibility:</p>
          <SegmentedButtonGroup
            options={ROOMMATE_FLEXIBILITY_OPTIONS}
            selectedValue={flexibility}
            onChange={onFlexibilityChange}
            ariaLabel="Move-in date flexibility"
          />
        </div>
      </div>
    </section>

    <section className="filter-menu__section roommate-filters__section">
      <h3 className="filter-menu__section-title">
        Apartment Details <span>(applies to the entire unit)</span>
      </h3>
      <div className="roommate-filters__stack">
        <div className="roommate-inline-row">
          <div>
            <p className="roommate-filters__field-title">Total Roommates in Apartment</p>
            <p className="roommate-filters__hint">(incl. you)</p>
          </div>
          <div className="roommate-inline-row__control">
            <OptionButtonGroup
              options={ROOMMATE_COUNT_OPTIONS}
              selectedValue={totalRoommates}
              onChange={onTotalRoommatesChange}
              compact
              ariaLabel="Total roommates in apartment"
            />
          </div>
        </div>
        <div>
          <label className="roommate-filters__field-title" htmlFor="roommate-location-preference">
            Location Preference <span>(e.g., Neighborhood, Landmark)</span>
          </label>
          <input
            id="roommate-location-preference"
            type="text"
            value={locationPreference}
            onChange={(event) => onLocationPreferenceChange(event.target.value)}
            placeholder="Location Landmark"
            className="roommate-text-input"
          />
        </div>
      </div>
    </section>

    <section className="filter-menu__section roommate-filters__section">
      <h3 className="filter-menu__section-title">
        Roommate Profile <span>(preferences)</span>
      </h3>
      <div className="roommate-filters__stack">
        <div>
          <p className="roommate-filters__field-title">Gender</p>
          <SegmentedButtonGroup
            options={ROOMMATE_GENDER_OPTIONS}
            selectedValue={gender}
            onChange={onGenderChange}
            ariaLabel="Gender preference"
          />
        </div>
        <div>
          <p className="roommate-filters__field-title">Habits</p>
          <div className="roommate-filters__habits">
            <div>
              <p className="roommate-filters__sub-label">Smoking Preference</p>
              <SegmentedButtonGroup
                options={ROOMMATE_SMOKING_OPTIONS}
                selectedValue={smoking}
                onChange={onSmokingChange}
                ariaLabel="Smoking preference"
              />
            </div>
            <div>
              <p className="roommate-filters__sub-label">Keep Kosher Kitchen</p>
              <div className="roommate-toggle-row">
                <button
                  type="button"
                  className={`roommate-toggle ${kosher ? 'is-on' : ''}`}
                  onClick={() => onKosherChange(!kosher)}
                  aria-pressed={kosher}
                  aria-label="Keep kosher kitchen required"
                >
                  <span className="roommate-toggle__knob" />
                </button>
                <span>Required/Not Required</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="filter-menu__section roommate-filters__section">
      <h3 className="filter-menu__section-title">Property Amenities (New)</h3>
      <div className="roommate-amenities-grid" aria-label="Property amenities">
        {ROOMMATE_AMENITY_ITEMS.map((amenity) => {
          const isSelected = amenities.includes(amenity.id);
          return (
            <button
              key={amenity.id}
              type="button"
              className={`roommate-amenity ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onAmenityToggle(amenity.id)}
              aria-pressed={isSelected}
            >
              <CharacteristicIcon name={amenity.icon} />
              <span>{amenity.id}</span>
            </button>
          );
        })}
      </div>
    </section>

    <div className="roommate-filter-actions">
      <button type="button" className="roommate-filter-actions__apply" onClick={onApplyFilters}>
        Apply Filters
      </button>
      <button type="button" className="roommate-filter-actions__save" onClick={onSaveFilters}>
        Save Filters
      </button>
    </div>
  </div>
);

const clampFilterPriceValue = (value) => {
  const asNumber = Number(value);
  if (Number.isNaN(asNumber)) return FILTER_PRICE_MIN;
  return Math.min(FILTER_PRICE_MAX, Math.max(FILTER_PRICE_MIN, asNumber));
};

const formatFilterPriceLabel = (value, isUpper = false, locale = 'en-US') => {
  const normalizedValue = clampFilterPriceValue(value);
  const formattedValue = normalizedValue.toLocaleString(locale);
  return isUpper && normalizedValue >= FILTER_PRICE_MAX ? `₪${formattedValue}+` : `₪${formattedValue}`;
};

const BudgetRange = ({ minPrice, maxPrice, locale, onMinPriceChange, onMaxPriceChange }) => {
  const normalizedMin = clampFilterPriceValue(minPrice);
  const normalizedMax = Math.max(normalizedMin + FILTER_PRICE_STEP, clampFilterPriceValue(maxPrice));
  const boundedMax = Math.min(FILTER_PRICE_MAX, normalizedMax);
  const minPercent = ((normalizedMin - FILTER_PRICE_MIN) / (FILTER_PRICE_MAX - FILTER_PRICE_MIN)) * 100;
  const maxPercent = ((boundedMax - FILTER_PRICE_MIN) / (FILTER_PRICE_MAX - FILTER_PRICE_MIN)) * 100;

  const handleMinChange = (event) => {
    const nextValue = Math.min(clampFilterPriceValue(event.target.value), boundedMax - FILTER_PRICE_STEP);
    onMinPriceChange(String(nextValue));
  };

  const handleMaxChange = (event) => {
    const nextValue = Math.max(clampFilterPriceValue(event.target.value), normalizedMin + FILTER_PRICE_STEP);
    onMaxPriceChange(String(nextValue));
  };

  return (
    <div className="roommate-budget-range">
      <p className="roommate-filters__field-title">Total Monthly Rent</p>
      <div className="roommate-budget-range__labels" aria-hidden="true">
        <span>Min</span>
        <span>Max</span>
      </div>
      <div
        className="roommate-budget-range__track"
        style={{
          '--roommate-budget-min': `${minPercent}%`,
          '--roommate-budget-max': `${maxPercent}%`,
        }}
      >
        <input
          type="range"
          min={FILTER_PRICE_MIN}
          max={FILTER_PRICE_MAX}
          step={FILTER_PRICE_STEP}
          value={normalizedMin}
          onChange={handleMinChange}
          aria-label="Minimum total monthly rent"
        />
        <input
          type="range"
          min={FILTER_PRICE_MIN}
          max={FILTER_PRICE_MAX}
          step={FILTER_PRICE_STEP}
          value={boundedMax}
          onChange={handleMaxChange}
          aria-label="Maximum total monthly rent"
        />
      </div>
      <div className="roommate-budget-range__values" aria-live="polite">
        <span>{formatFilterPriceLabel(normalizedMin, false, locale)}</span>
        <span>{formatFilterPriceLabel(boundedMax, true, locale)}</span>
      </div>
    </div>
  );
};

const OptionButtonGroup = ({ options, selectedValue, onChange, disabled, compact, ariaLabel }) => (
  <div className={`roommate-option-group ${compact ? 'roommate-option-group--compact' : ''}`} aria-label={ariaLabel}>
    {options.map((option) => (
      <button
        key={option}
        type="button"
        className={`roommate-option ${selectedValue === option ? 'is-selected' : ''}`}
        onClick={() => onChange(option)}
        disabled={disabled}
        aria-pressed={!disabled && selectedValue === option}
      >
        {option}
      </button>
    ))}
  </div>
);

const SegmentedButtonGroup = ({ options, selectedValue, onChange, ariaLabel }) => (
  <div className="roommate-segmented" aria-label={ariaLabel}>
    {options.map((option) => (
      <button
        key={option}
        type="button"
        className={selectedValue === option ? 'is-selected' : ''}
        onClick={() => onChange(option)}
        aria-pressed={selectedValue === option}
      >
        {option}
      </button>
    ))}
  </div>
);

const FeatureCard = ({ icon, label, isSelected, onClick }) => (
  <button type="button" className={`filter-menu__feature-card ${isSelected ? 'is-selected' : ''}`} onClick={onClick}>
    <span className="filter-menu__feature-icon" aria-hidden="true">
      <CharacteristicIcon name={icon} />
    </span>
    <span>{label}</span>
  </button>
);

const CharacteristicIcon = ({ name }) => (
  <svg className="filter-menu__characteristic-svg" viewBox="0 0 24 24" focusable="false">
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
};

export default FilterMenu;
