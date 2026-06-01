import React from 'react';

const DrawAreaIcon = () => (
  <svg
    className="map-area-control-icon map-area-control-icon--draw"
    viewBox="0 0 32 32"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <marker
        id="draw-area-arrowhead"
        markerWidth="7"
        markerHeight="7"
        refX="5.7"
        refY="3.5"
        orient="auto"
      >
        <path d="M0 0L7 3.5L0 7Z" fill="currentColor" />
      </marker>
    </defs>
    <path
      d="M26.1 14.4C25.3 8.7 20.4 4.5 14.6 4.9C8.2 5.2 3.3 10.7 3.8 17.1C4.2 23.5 9.7 28.4 16.1 27.9C21.2 27.6 25.3 24.2 26.7 19.6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="4 2.4"
      markerEnd="url(#draw-area-arrowhead)"
    />
    <path
      d="M8.2 20.5L4.5 24.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
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
