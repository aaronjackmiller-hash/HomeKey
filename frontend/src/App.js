import React from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import './App.css';
import PropertyList from './components/PropertyList';
import PropertyDetail from './components/PropertyDetail';
import AddListing from './components/AddListing';

const App = () => {
  return (
    <Router>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          🏠 Home<span>Key</span>
        </Link>
        <div className="navbar-links">
          <Link to="/">Listings</Link>
          <Link to="/add">Add Property</Link>
        </div>
      </nav>

      <main className="main-content">
        <Switch>
          <Route exact path="/" component={PropertyList} />
          <Route path="/properties/:id" component={PropertyDetail} />
          <Route path="/add" component={AddListing} />
        </Switch>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} HomeKey — Israeli Real Estate MLS</p>
      </footer>
    </Router>
  );
};

export default App;