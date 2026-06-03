import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const FEATURE_ITEMS = [
  { id: 'elevator', labelKey: 'filterMenu.elevator', icon: 'EL' },
  { id: 'parking', labelKey: 'filterMenu.parking', icon: 'PK' },
  { id: 'pets', labelKey: 'filterMenu.petsAllowed', icon: 'PT' },
  { id: 'disabled-access', labelKey: 'filterMenu.disabledAccess', icon: 'DA' },
  { id: 'renovated', labelKey: 'filterMenu.renovated', icon: 'RN' },
  { id: 'furnished', labelKey: 'filterMenu.furnished', icon: 'FR' },
];

const DETAIL_ITEMS = [
  { id: 'oven', labelKey: 'filterMenu.oven' },
  { id: 'balcony', labelKey: 'filterMenu.balcony' },
  { id: 'stovetop', labelKey: 'filterMenu.stovetop' },
  { id: 'laundry-facilities', labelKey: 'filterMenu.laundryFacilities' },
  { id: 'in-unit-washer-dryer', labelKey: 'filterMenu.inUnitWasherDryer' },
];

const LISTING_TYPE_OPTIONS = ['rental', 'sale', 'roommates'];

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
          <span className="filter-menu__mamad-icon" aria-hidden="true">🛡</span>
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
    <span className="filter-menu__feature-icon" aria-hidden="true">{icon}</span>
    <span>{label}</span>
  </button>
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
