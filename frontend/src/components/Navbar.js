import React from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const history = useHistory();

  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  return (
    <nav>
      <Link to="/">HomeKey</Link>
      {isAuthenticated ? (
        <>
          <Link to="/add-listing">Add Listing</Link>
          <span style={{ color: 'white', padding: '14px 10px' }}>Hi, {user?.name}</span>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '14px 20px' }}>
            Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/login">Sign In</Link>
          <Link to="/register">Register</Link>
        </>
      )}
    </nav>
  );
};

export default Navbar;
