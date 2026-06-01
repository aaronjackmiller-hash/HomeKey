import React from 'react';

const DrawAreaIcon = () => (
  <svg
    className="map-area-control-icon map-area-control-icon--draw"
    viewBox="0 0 40 40"
    aria-hidden="true"
    focusable="false"
  >
    <circle
      cx="20"
      cy="20"
      r="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    />
    <path
      d="M20 5L25.8 12.4H22.8V27.6H25.8L20 35L14.2 27.6H17.2V12.4H14.2L20 5Z"
      fill="currentColor"
    />
    <path
      d="M5 20L12.4 14.2V17.2H27.6V14.2L35 20L27.6 25.8V22.8H12.4V25.8L5 20Z"
      fill="currentColor"
    />
  </svg>
);

const ClearAreaIcon = () => (
  <svg
    className="map-area-control-icon map-area-control-icon--clear"
    viewBox="0 0 40 32"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M3 16L14 5H36V27H14L3 16Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.4"
      strokeLinejoin="round"
    />
    <path
      d="M19.4 10.8L28.6 20M28.6 10.8L19.4 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="4.5"
      strokeLinecap="round"
    />
  </svg>
);

const MapAreaControls = ({
  drawMode = false,
  onToggleDrawMode,
  onClearArea,
  clearDisabled = false,
  drawLabel,
  clearLabel,
  toolbarLabel,
}) => (
  <div className="google-listings-map-toolbar google-listings-map-area-controls" role="toolbar" aria-label={toolbarLabel}>
    <button
      type="button"
      className={`secondary-btn map-draw-btn map-area-control ${drawMode ? 'is-active' : ''}`}
      onClick={onToggleDrawMode}
      aria-pressed={drawMode}
    >
      <DrawAreaIcon />
      <span>{drawLabel}</span>
    </button>
    <button
      type="button"
      className="secondary-btn map-draw-btn map-area-control"
      onClick={onClearArea}
      disabled={clearDisabled}
    >
      <ClearAreaIcon />
      <span>{clearLabel}</span>
    </button>
  </div>
);

export default MapAreaControls;
