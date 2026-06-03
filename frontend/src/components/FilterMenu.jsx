import React from 'react';
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
};

const FilterMenu = ({
  onClearAllFilters,
  listingType,
  roomOptions,
  bathOptions,
  rooms,
  baths,
  propertyCategory,
  selectedFeatures,
  onListingTypeChange,
  onRoomsChange,
  onBathsChange,
  onTogglePropertyCategory,
  onToggleFeature,
}) => {
  const { t } = useLanguage();
  const selectedFeatureSet = new Set(selectedFeatures || []);
  return (
    <div className="filter-menu">
      <div className="filter-menu__header">
        <h2 className="filter-menu__title">{t('filterMenu.title')}</h2>
        <button type="button" className="filter-menu__cancel" onClick={onClearAllFilters}>
          {t('filterMenu.clearAll')}
        </button>
      </div>

      <section className="filter-menu__section">
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
    </div>
  );
};

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
  propertyCategory: '',
  selectedFeatures: [],
  onListingTypeChange: () => {},
  onRoomsChange: () => {},
  onBathsChange: () => {},
  onTogglePropertyCategory: () => {},
  onToggleFeature: () => {},
};

export default FilterMenu;
