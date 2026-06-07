import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
  document.getElementById('root')
);
/* ── Location Autocomplete Dropdown ── */
.location-autocomplete {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  align-self: stretch;
  display: flex;
  align-items: center;
}

.location-autocomplete input {
  flex: 1 1 auto;
  align-self: stretch;
  height: 100%;
  min-height: 42px;
  min-width: 0;
  outline: none;
  border: 0;
  background: transparent;
  padding: 0;
  line-height: 42px;
  color: #151b23;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  width: 100%;
}

.location-autocomplete input::placeholder {
  color: #20262d;
  opacity: 1;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.location-autocomplete__dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: -16px;
  min-width: 320px;
  max-width: 400px;
  background: #ffffff;
  border: 1px solid #d4dae5;
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
  z-index: 100;
  overflow: hidden;
  max-height: 400px;
  overflow-y: auto;
}

html[dir="rtl"] .location-autocomplete__dropdown {
  left: auto;
  right: -16px;
}

.location-autocomplete__section-header {
  padding: 10px 16px 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #9ca3af;
  text-transform: uppercase;
  background: #f9fafb;
  border-bottom: 1px solid #f3f4f6;
}

.location-autocomplete__item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: #111827;
  font-size: 0.92rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease;
  text-transform: none;
  letter-spacing: 0;
}

html[dir="rtl"] .location-autocomplete__item {
  text-align: right;
  flex-direction: row-reverse;
}

.location-autocomplete__item:hover,
.location-autocomplete__item.is-active {
  background: #f0fdf4;
  color: #14532d;
}

.location-autocomplete__item--recent {
  color: #6b7280;
}

.location-autocomplete__item--recent:hover {
  background: #f9fafb;
  color: #374151;
}

.location-autocomplete__item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: #9ca3af;
}

.location-autocomplete__item-icon .premium-header__icon {
  width: 16px;
  height: 16px;
}

.location-autocomplete__item:hover .location-autocomplete__item-icon,
.location-autocomplete__item.is-active .location-autocomplete__item-icon {
  color: #16a34a;
}

@media (max-width: 767px) {
  .location-autocomplete__dropdown {
    left: 0;
    right: 0;
    min-width: 0;
    width: 100%;
    max-width: 100%;
  }
}
