import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PropertyList from './components/PropertyList';
import PropertyDetail from './components/PropertyDetail';
import AddListing from './components/AddListing';
import './App.css';

const App = () => {
  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <Link to="/" className="logo">
            🏠 HomeKey
          </Link>
          <nav>
            <Link to="/">Browse Listings</Link>
            <Link to="/add" className="btn-add">+ Add Listing</Link>
          </nav>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<PropertyList />} />
            <Route path="/properties/:id" element={<PropertyDetail />} />
            <Route path="/add" element={<AddListing />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>HomeKey MLS &mdash; Israeli Real Estate Platform &copy; {new Date().getFullYear()}</p>
        </footer>
      </div>
    </Router>
  );
};

export default App;