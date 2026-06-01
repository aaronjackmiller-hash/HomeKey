import React from 'react';

const DrawAreaIcon = () => (
  <svg
    className="map-area-control-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M5.2 8.4C7.3 4.9 12.4 4.2 16.1 6.1C20.1 8.2 20.9 13.2 18.5 16.4C16.3 19.4 11.1 20.1 7.5 18.2C3.8 16.2 3.1 11.9 5.2 8.4Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="3 2.4"
    />
    <path
      d="M7.5 15.9L4.8 18.6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M4.1 19.3L6 20.1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
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
