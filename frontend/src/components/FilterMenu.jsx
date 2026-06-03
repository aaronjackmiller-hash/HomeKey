import React, { useState } from 'react';

const FilterBar = ({ onClearAllFilters, onApplyFilters }) => {
  const [locationPreference, setLocationPreference] = useState('');

  const handleReset = () => {
    setLocationPreference('');
    onClearAllFilters();
  };

  return (
    <div className="filter-menu filter-bar">
      <div className="filter-bar__inner">
        <div className="filter-bar__field">
          <label className="filter-bar__label" htmlFor="filter-location-preference">
            Location Preference
          </label>
          <input
            id="filter-location-preference"
            type="text"
            value={locationPreference}
            onChange={(event) => setLocationPreference(event.target.value)}
            placeholder="City, neighborhood..."
            className="filter-bar__input"
          />
        </div>

        <div className="filter-bar__details" aria-label="Apartment details">
          <span className="filter-bar__detail">Rooms: 1+</span>
          <span className="filter-bar__detail">Beds: 1+</span>
          <span className="filter-bar__detail">Bath: 1+</span>
        </div>

        <div className="filter-bar__actions">
          <button type="button" className="filter-bar__reset" onClick={handleReset}>
            Reset
          </button>
          <button type="button" className="filter-bar__apply" onClick={onApplyFilters}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

FilterBar.defaultProps = {
  onClearAllFilters: () => {},
  onApplyFilters: () => {},
};

export default FilterBar;
