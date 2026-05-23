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

const FilterMenu = ({
  onClearAllFilters,
  minPrice,
  maxPrice,
  propertyCategory,
  selectedFeatures,
  onMinPriceChange,
  onMaxPriceChange,
  onTogglePropertyCategory,
  onToggleFeature,
}) => {
  const { t } = useLanguage();
  const normalizedMin = Number(minPrice);
  const normalizedMax = Number(maxPrice);
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
        <h3 className="filter-menu__section-title">{t('filterMenu.priceRange')}</h3>
        <div className="filter-menu__price-grid">
          <div className="filter-menu__price-field">
            <label htmlFor="filter-menu-min-price">{t('filterMenu.minPrice')}</label>
            <input
              id="filter-menu-min-price"
              type="number"
              placeholder={t('filterMenu.noMin')}
              value={normalizedMin > 0 ? normalizedMin : ''}
              onChange={(event) => onMinPriceChange(event.target.value)}
            />
          </div>
          <div className="filter-menu__price-field">
            <label htmlFor="filter-menu-max-price">{t('filterMenu.maxPrice')}</label>
            <input
              id="filter-menu-max-price"
              type="number"
              placeholder={t('filterMenu.noMax')}
              value={normalizedMax > 0 ? normalizedMax : ''}
              onChange={(event) => onMaxPriceChange(event.target.value)}
            />
          </div>
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
        <h3 className="filter-menu__section-title">{t('filterMenu.propertyCharacteristics')}</h3>
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
      </section>

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
  minPrice: 0,
  maxPrice: 20000,
  propertyCategory: '',
  selectedFeatures: [],
  onMinPriceChange: () => {},
  onMaxPriceChange: () => {},
  onTogglePropertyCategory: () => {},
  onToggleFeature: () => {},
};

export default FilterMenu;
