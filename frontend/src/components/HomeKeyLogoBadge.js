import React from 'react';

const HomeKeyLogoBadge = ({ compact = false, className = '', ariaLabel = 'HomeKey logo' }) => (
  <div className={`homekey-logo-lockup ${compact ? 'homekey-logo-lockup--compact' : ''} ${className}`.trim()} aria-label={ariaLabel}>
    <svg
      className="homekey-logo-lockup-svg"
      viewBox={compact ? '0 0 280 120' : '0 0 240 220'}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      {compact ? (
        <>
          <rect x="5" y="5" width="270" height="110" rx="18" fill="#f8fafc" stroke="#9fb3c8" strokeWidth="4" />
          <g transform="translate(22 18)">
            <path d="M20 40 48 18l28 22v34H62V52H34v22H20V40Z" fill="#1f3f79" />
            <rect x="43" y="56" width="10" height="10" rx="2" fill="#dbeafe" />
            <circle cx="28" cy="84" r="11" fill="#1f3f79" />
            <circle cx="25" cy="84" r="3" fill="#dbeafe" />
            <rect x="39" y="81" width="44" height="6" rx="3" fill="#1f3f79" />
            <polygon points="80,84 86,81 90,84 86,87" fill="#1f3f79" />
          </g>
          <text x="154" y="62" textAnchor="middle" fontSize="40" fontFamily="Inter, Segoe UI, Arial, sans-serif" fontWeight="800" fill="#1f3f79">
            HomeKey
          </text>
          <text x="154" y="86" textAnchor="middle" fontSize="14" fontFamily="Inter, Segoe UI, Arial, sans-serif" fontWeight="700" letterSpacing="1.1" fill="#1f3553">
            REAL ESTATE PLATFORM
          </text>
        </>
      ) : (
        <>
          <rect x="6" y="6" width="228" height="208" rx="26" fill="#f8fafc" stroke="#9fb3c8" strokeWidth="6" />
          <g fill="#1f3f79">
            <path d="M80 90 120 58l40 32v36h-15V99h-50v27H80V90Z" />
            <rect x="108" y="103" width="11" height="11" rx="1.5" fill="#dbeafe" />
            <rect x="122" y="103" width="11" height="11" rx="1.5" fill="#dbeafe" />
            <rect x="108" y="117" width="11" height="11" rx="1.5" fill="#dbeafe" />
            <rect x="122" y="117" width="11" height="11" rx="1.5" fill="#dbeafe" />
            <circle cx="88" cy="140" r="16" />
            <circle cx="84" cy="140" r="4.2" fill="#dbeafe" />
            <rect x="101" y="136" width="62" height="8" rx="4" />
            <polygon points="155,140 162,136 166,140 162,144" />
          </g>
          <text x="120" y="178" textAnchor="middle" fontSize="54" fontFamily="Inter, Segoe UI, Arial, sans-serif" fontWeight="700" fill="#1f3f79">
            HomeKey
          </text>
          <text x="120" y="202" textAnchor="middle" fontSize="18" fontFamily="Inter, Segoe UI, Arial, sans-serif" fontWeight="700" letterSpacing="1.2" fill="#1f3553">
            REAL ESTATE PLATFORM
          </text>
        </>
      )}
    </svg>
  </div>
);

export default HomeKeyLogoBadge;
