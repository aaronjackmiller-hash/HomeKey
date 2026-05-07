import React, { useEffect, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import HomeKeyLogoBadge from './HomeKeyLogoBadge';
import { getInterestSummary } from '../utils/propertyInterest';

const Navbar = () => {
  const history = useHistory();
  const location = useLocation();
  const [searchValue, setSearchValue] = useState('');
  const [interestSummary, setInterestSummary] = useState(() => getInterestSummary());

  useEffect(() => {
    const refreshInterestSummary = () => {
      setInterestSummary(getInterestSummary());
    };
    refreshInterestSummary();
    if (typeof window !== 'undefined') {
      window.addEventListener('homekey:interest-updated', refreshInterestSummary);
      window.addEventListener('storage', refreshInterestSummary);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('homekey:interest-updated', refreshInterestSummary);
        window.removeEventListener('storage', refreshInterestSummary);
      }
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchValue(params.get('q') || '');
  }, [location.search]);

  const likedCount = Array.isArray(interestSummary.favoriteIds) ? interestSummary.favoriteIds.length : 0;
  const heartClickCount = Number(interestSummary.heartClickCount) || 0;

  const handleHeaderSearchSubmit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams(location.search);
    const trimmedQuery = searchValue.trim();
    if (trimmedQuery) {
      params.set('q', trimmedQuery);
    } else {
      params.delete('q');
    }
    const nextSearch = params.toString();
    history.push({
      pathname: '/',
      search: nextSearch ? `?${nextSearch}` : '',
    });
  };

  return (
    <nav className="premium-header" aria-label="Primary navigation">
      <div className="premium-header__inner">
        <div className="premium-header__brand-cell">
          <Link to="/" className="premium-header__brand" aria-label="HomeKey home">
            <HomeKeyLogoBadge className="premium-header__logo" ariaLabel="HomeKey logo" />
          </Link>
        </div>

        <div className="premium-header__nav-cell">
          <div className="premium-header__links">
            <Link to="/" className="premium-header__link">Buy</Link>
            <Link to="/" className="premium-header__link">Rent</Link>
            <Link to="/" className="premium-header__link">Neighborhoods</Link>
            <Link to="/add-listing" className="premium-header__link">List Property</Link>
            <Link to="/" className="premium-header__link">About</Link>
          </div>
          <form className="premium-header__search" onSubmit={handleHeaderSearchSubmit} role="search">
            <input
              type="search"
              className="premium-header__search-input"
              placeholder="Search city, neighborhood, or listing"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              aria-label="Search listings"
            />
            <button className="premium-header__search-btn" type="submit">Search</button>
          </form>
        </div>

        <div className="premium-header__actions premium-header__actions-cell">
          <div className="premium-header__likes" aria-live="polite" aria-label={`Liked apartments ${likedCount}. Total heart clicks ${heartClickCount}.`}>
            <svg className="premium-header__likes-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 21s-6.6-4.5-9.1-8.2C.8 9.5 1.5 5.8 4.5 4c2.2-1.3 5-.7 6.7 1.2L12 6l.8-.8c1.8-1.9 4.5-2.4 6.7-1.2 3 1.8 3.7 5.5 1.6 8.8C18.6 16.5 12 21 12 21Z" />
            </svg>
            <div className="premium-header__likes-copy">
              <span>Liked {likedCount}</span>
              <span>Clicks {heartClickCount}</span>
            </div>
          </div>
          <button className="premium-header__language-toggle" type="button" aria-label="Toggle language">
            <span className="premium-header__flag-icon" aria-hidden="true">
              <span className="premium-header__flag-star">✡</span>
            </span>
            <span className="premium-header__language-text">He</span>
          </button>
          <Link to="/add-listing" className="premium-header__cta">List a Property</Link>
          <Link to="/login" className="premium-header__login">Login</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
