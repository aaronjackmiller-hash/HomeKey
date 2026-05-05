import React from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HOMEKEY_LOGO_SRC } from './HomeKeyLogoBadge';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const history = useHistory();

  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  return (
    <nav className="site-nav">
      <div className="site-nav__inner">
        <Link to="/" className="site-nav__brand" aria-label="HomeKey">
          <img src={HOMEKEY_LOGO_SRC} alt="HomeKey logo" className="site-nav__brand-logo" />
          <span className="site-nav__brand-wordmark">HomeKey</span>
        </Link>
        <div className="site-nav__links">
          {isAuthenticated ? (
            <>
              <Link to="/add-listing" className="site-nav__link">Add Listing</Link>
              <Link to="/admin/import-yad2" className="site-nav__link">Import Yad2</Link>
              <span className="site-nav__welcome">Hi, {user?.name || 'Agent'}</span>
              <button onClick={handleLogout} className="site-nav__link site-nav__button" type="button">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="site-nav__link">Sign In</Link>
              <Link to="/register" className="site-nav__link site-nav__link--cta">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
