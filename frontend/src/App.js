import React, { useState } from 'react';
import PropertyList from './components/PropertyList';
import PropertyDetail from './components/PropertyDetail';
import AgentList from './components/AgentList';
import './App.css';

const VIEWS = { properties: 'properties', detail: 'detail', agents: 'agents' };

const App = () => {
  const [view, setView] = useState(VIEWS.properties);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

  const handleSelectProperty = (property) => {
    setSelectedPropertyId(property._id);
    setView(VIEWS.detail);
  };

  const handleBack = () => {
    setSelectedPropertyId(null);
    setView(VIEWS.properties);
  };

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-inner">
          <h1 className="app__logo" onClick={() => setView(VIEWS.properties)}>
            🏠 HomeKey
          </h1>
          <nav className="app__nav">
            <button
              className={`app__nav-btn${view === VIEWS.properties || view === VIEWS.detail ? ' app__nav-btn--active' : ''}`}
              onClick={() => { setView(VIEWS.properties); setSelectedPropertyId(null); }}
            >
              Listings
            </button>
            <button
              className={`app__nav-btn${view === VIEWS.agents ? ' app__nav-btn--active' : ''}`}
              onClick={() => setView(VIEWS.agents)}
            >
              Agents
            </button>
          </nav>
        </div>
      </header>

      <main className="app__main">
        {view === VIEWS.properties && (
          <PropertyList onSelectProperty={handleSelectProperty} />
        )}
        {view === VIEWS.detail && selectedPropertyId && (
          <PropertyDetail propertyId={selectedPropertyId} onBack={handleBack} />
        )}
        {view === VIEWS.agents && (
          <AgentList />
        )}
      </main>

      <footer className="app__footer">
        <p>© {new Date().getFullYear()} HomeKey — MLS Real Estate Platform</p>
      </footer>
    </div>
  );
};

export default App;
