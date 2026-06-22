/**
 * index.js
 * React app entry point — path: frontend/src/index.js
 *
 * Restored from commit 2b30279 (Apr 22, 2026) after later commits
 * accidentally overwrote this file with CSS content. Every commit
 * touching this file since then had a styles-related message
 * ("Add styles for location autocomplete dropdown", "Move autocomplete
 * styles into stylesheet", "Add roommate detail contact button
 * styles.index.js") — the same CSS/JS mix-up, repeated.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
