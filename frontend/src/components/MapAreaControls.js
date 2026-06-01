import React from 'react';

const DrawAreaIcon = () => (
  <svg
    className="map-area-control-icon map-area-control-icon--draw"
    viewBox="0 0 32 32"
    aria-hidden="true"
    focusable="false"
  >
    <circle
      cx="16"
      cy="16"
      r="11"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeDasharray="4.4 2.7"
    />
    <path
      d="M23.3 4.8L27 11.2L19.9 10.4Z"
      fill="currentColor"
    />
  </svg>
);

const ClearAreaIcon = () => (
  <svg
    className="map-area-control-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M7.5 7.3H17.4C18.3 7.3 19.1 8.1 19.1 9V15C19.1 15.9 18.3 16.7 17.4 16.7H7.5L4.2 12L7.5 7.3Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.1 10.1L14.3 14.3M14.3 10.1L10.1 14.3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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
