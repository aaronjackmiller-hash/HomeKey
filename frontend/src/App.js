import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';
import PropertyList from './components/PropertyList';
import PropertyDetail from './components/PropertyDetail';
import './App.css';

function App() {
    return (
        <Router>
            <header className="header">
                <Link to="/" className="logo">HomeKey</Link>
            </header>
            <main className="main">
                <Switch>
                    <Route exact path="/" component={PropertyList} />
                    <Route path="/properties/:id" component={PropertyDetail} />
                </Switch>
            </main>
        </Router>
    );
}

export default App;