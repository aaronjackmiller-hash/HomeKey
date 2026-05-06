import React from 'react';
import { Link } from 'react-router-dom';
import HomeKeyLogoBadge from './HomeKeyLogoBadge';

const Navbar = () => {
  return (
    <nav className="premium-header" aria-label="Primary navigation">
      <div className="premium-header__inner">
        <div className="premium-header__brand-cell">
          <Link to="/" className="premium-header__brand" aria-label="HomeKey home">
            <HomeKeyLogoBadge compact className="premium-header__logo" ariaLabel="HomeKey H-with-keyhole logo" />
            <span className="premium-header__brand-wordmark">HomeKey</span>
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
        </div>

        <div className="premium-header__actions premium-header__actions-cell">
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
