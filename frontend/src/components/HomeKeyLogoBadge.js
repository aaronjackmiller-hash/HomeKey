import React from 'react';

const HomeKeyLogoBadge = ({ compact = false, className = '', ariaLabel = 'HomeKey logo' }) => (
  <div className={`homekey-logo-lockup ${compact ? 'homekey-logo-lockup--compact' : ''} ${className}`.trim()} aria-label={ariaLabel}>
    <svg
      className="homekey-logo-lockup-svg"
      viewBox="0 0 256 256"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="hk-metal-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4f8fd" />
          <stop offset="34%" stopColor="#ccd6e0" />
          <stop offset="60%" stopColor="#edf2f7" />
          <stop offset="100%" stopColor="#a6b3c1" />
        </linearGradient>
        <linearGradient id="hk-metal-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.58)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.52)" />
        </linearGradient>
        <linearGradient id="hk-navy" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2f4e86" />
          <stop offset="100%" stopColor="#0f2c63" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="248" height="248" rx="36" fill="url(#hk-metal-bg)" stroke="#6d7f96" strokeWidth="3.2" />
      <rect x="14" y="14" width="228" height="228" rx="28" fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth="3" />
      <rect x="14" y="14" width="228" height="228" rx="28" fill="none" stroke="rgba(80,95,113,0.26)" strokeWidth="2" />
      <rect x="26" y="26" width="204" height="204" rx="22" fill="url(#hk-metal-sheen)" />

      <g fill="url(#hk-navy)">
        <path d="M83 102 127 68l46 34v40h-16v-30h-61v30H83v-40Z" />
        <rect x="117" y="117" width="10" height="10" rx="1.6" fill="#d9e7ff" />
        <rect x="131" y="117" width="10" height="10" rx="1.6" fill="#d9e7ff" />
        <rect x="117" y="131" width="10" height="10" rx="1.6" fill="#d9e7ff" />
        <rect x="131" y="131" width="10" height="10" rx="1.6" fill="#d9e7ff" />
        <circle cx="92" cy="155" r="14" />
        <circle cx="88" cy="155" r="3.5" fill="#d9e7ff" />
        <rect x="106" y="151" width="62" height="8" rx="4" />
        <polygon points="160,155 167,151 171,155 167,159" />
      </g>

      <text x="128" y="196" textAnchor="middle" fontSize="56" fontFamily="Inter, Segoe UI, Arial, sans-serif" fill="url(#hk-navy)">
        <tspan fontWeight="800">Home</tspan>
        <tspan fontWeight="500">Key</tspan>
      </text>
      <text
        x="128"
        y="217"
        textAnchor="middle"
        fontSize="17"
        fontFamily="Inter, Segoe UI, Arial, sans-serif"
        fontWeight="700"
        letterSpacing="1"
        fill="#1f355f"
      >
        REAL ESTATE PLATFORM
      </text>
    </svg>
  </div>
);

export default HomeKeyLogoBadge;
