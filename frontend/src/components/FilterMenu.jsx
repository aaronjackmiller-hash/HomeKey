import React from 'react';
import {
  Shield,
  Car,
  Accessibility,
  Dog,
  Paintbrush,
  Armchair,
  Elevator,
} from 'lucide-react';

const FilterMenu = ({ onClose }) => {
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
            <input id="filter-menu-min-price" type="number" placeholder="No Min" />
          </div>
          <div className="filter-menu__price-field">
            <label htmlFor="filter-menu-max-price">Max ₪</label>
            <input id="filter-menu-max-price" type="number" placeholder="₪ 2,200" />
          </div>
        </div>
      </section>

      <section className="filter-menu__section">
        <h3 className="filter-menu__section-title">Property Types</h3>
        <div className="filter-menu__type-row">
          <button type="button" className="filter-menu__chip">Apartments</button>
          <button type="button" className="filter-menu__chip">Houses</button>
        </div>
      </section>

      <section className="filter-menu__section">
        <h3 className="filter-menu__section-title">Property Characteristics</h3>
        <div className="filter-menu__features-grid">
          <FeatureCard icon={<Elevator size={18} />} label="Elevator" />
          <FeatureCard icon={<Car size={18} />} label="Parking" />
          <FeatureCard icon={<Dog size={18} />} label="Pets Allowed" />
          <FeatureCard icon={<Accessibility size={18} />} label="Disabled Access" />
          <FeatureCard icon={<Paintbrush size={18} />} label="Renovated" />
          <FeatureCard icon={<Armchair size={18} />} label="Furnished" />
        </div>
      </section>

      <button type="button" className="filter-menu__mamad-btn">
        <Shield className="filter-menu__mamad-icon" />
        <div className="filter-menu__mamad-copy">
          <span>Mamad</span>
          <span>(Security Room)</span>
        </div>
      </button>
    </div>
  );
};

const FeatureCard = ({ icon, label }) => (
  <button type="button" className="filter-menu__feature-card">
    <span className="filter-menu__feature-icon">{icon}</span>
    <span>{label}</span>
  </button>
);

FilterMenu.defaultProps = {
  onClose: () => {},
};

export default FilterMenu;
