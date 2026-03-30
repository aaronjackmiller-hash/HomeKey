import React, { useState } from 'react';
import './SearchBar.css';

const SearchBar = ({ onSearch }) => {
  const [city, setCity] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const filters = {};
    if (city) filters.city = city;
    if (minPrice) filters.minPrice = minPrice;
    if (maxPrice) filters.maxPrice = maxPrice;
    if (bedrooms) filters.bedrooms = bedrooms;
    if (status) filters.status = status;
    onSearch(filters);
  };

  const handleReset = () => {
    setCity('');
    setMinPrice('');
    setMaxPrice('');
    setBedrooms('');
    setStatus('');
    onSearch({});
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="City"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="search-bar__input"
      />
      <input
        type="number"
        placeholder="Min Price"
        value={minPrice}
        onChange={(e) => setMinPrice(e.target.value)}
        className="search-bar__input search-bar__input--sm"
        min="0"
      />
      <input
        type="number"
        placeholder="Max Price"
        value={maxPrice}
        onChange={(e) => setMaxPrice(e.target.value)}
        className="search-bar__input search-bar__input--sm"
        min="0"
      />
      <select
        value={bedrooms}
        onChange={(e) => setBedrooms(e.target.value)}
        className="search-bar__select"
      >
        <option value="">Any Beds</option>
        <option value="1">1+</option>
        <option value="2">2+</option>
        <option value="3">3+</option>
        <option value="4">4+</option>
        <option value="5">5+</option>
      </select>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="search-bar__select"
      >
        <option value="">Any Status</option>
        <option value="active">Active</option>
        <option value="pending">Pending</option>
        <option value="sold">Sold</option>
      </select>
      <button type="submit" className="search-bar__btn">Search</button>
      <button type="button" className="search-bar__btn search-bar__btn--reset" onClick={handleReset}>
        Reset
      </button>
    </form>
  );
};

export default SearchBar;
