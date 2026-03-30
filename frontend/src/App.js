import React from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import PropertyList from './components/PropertyList';
import PropertyDetail from './components/PropertyDetail';
import AddListing from './components/AddListing';
import './App.css';

function App() {
  return (
    <Router>
      <header className="site-header">
        <Link to="/" className="logo">🏠 HomeKey</Link>
        <nav>
          <Link to="/">Listings</Link>
          <Link to="/add">Add Listing</Link>
        </nav>
      </header>

      <main className="site-main">
        <Switch>
          <Route exact path="/" component={PropertyList} />
          <Route path="/properties/:id" component={PropertyDetail} />
          <Route path="/add" component={AddListing} />
        </Switch>
      </main>
    </Router>
  );
}

export default App;
