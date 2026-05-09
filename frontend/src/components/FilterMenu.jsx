import React from 'react';

const FEATURE_ITEMS = [
  { id: 'elevator', label: 'Elevator', icon: 'EL' },
  { id: 'parking', label: 'Parking', icon: 'PK' },
  { id: 'pets', label: 'Pets Allowed', icon: 'PT' },
  { id: 'disabled-access', label: 'Disabled Access', icon: 'DA' },
  { id: 'renovated', label: 'Renovated', icon: 'RN' },
  { id: 'furnished', label: 'Furnished', icon: 'FR' },
];

const FilterMenu = ({
  onClose,
  minPrice,
  maxPrice,
  propertyCategory,
  selectedFeatures,
  onMinPriceChange,
  onMaxPriceChange,
  onTogglePropertyCategory,
  onToggleFeature,
}) => {
  const normalizedMin = Number(minPrice);
  const normalizedMax = Number(maxPrice);
  const selectedFeatureSet = new Set(selectedFeatures || []);
  return (
    <div className="filter-menu">
      <div className="filter-menu__header">
        <h2 className="filter-menu__title">Filters</h2>
        <button type="button" className="filter-menu__cancel" onClick={onClose}>
          Cancel
        </button>
      </div>

      <section className="filter-menu__section">
        <h3 className="filter-menu__section-title">Price Range</h3>
        <div className="filter-menu__price-grid">
          <div className="filter-menu__price-field">
            <label htmlFor="filter-menu-min-price">Min ₪</label>
            <input
              id="filter-menu-min-price"
              type="number"
              placeholder="No Min"
              value={normalizedMin > 0 ? normalizedMin : ''}
              onChange={(event) => onMinPriceChange(event.target.value)}
            />
          </div>
          <div className="filter-menu__price-field">
            <label htmlFor="filter-menu-max-price">Max ₪</label>
            <input
              id="filter-menu-max-price"
              type="number"
              placeholder="₪ 2,200"
              value={normalizedMax < 20000 ? normalizedMax : ''}
              onChange={(event) => onMaxPriceChange(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="filter-menu__section">
        <h3 className="filter-menu__section-title">Property Types</h3>
        <div className="filter-menu__type-row">
          <button
            type="button"
            className={`filter-menu__chip ${propertyCategory === 'apartments' ? 'is-selected' : ''}`}
            onClick={() => onTogglePropertyCategory('apartments')}
          >
            Apartments
          </button>
          <button
            type="button"
            className={`filter-menu__chip ${propertyCategory === 'houses' ? 'is-selected' : ''}`}
            onClick={() => onTogglePropertyCategory('houses')}
          >
            Houses
          </button>
        </div>
      </section>

      <section className="filter-menu__section">
        <h3 className="filter-menu__section-title">Property Characteristics</h3>
        <div className="filter-menu__features-grid">
          {FEATURE_ITEMS.map((feature) => (
            <FeatureCard
              key={feature.id}
              icon={feature.icon}
              label={feature.label}
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
          <span>Mamad</span>
          <span>(Security Room)</span>
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
  onClose: () => {},
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
