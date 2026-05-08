import React from 'react';
import hKeyholeLogo from '../assets/H Letter Logo Clear Background - Copy.png';

export const HOMEKEY_LOGO_SRC = hKeyholeLogo;

const HomeKeyLogoBadge = ({ compact = false, className = '', ariaLabel = 'HomeKey logo' }) => (
  <div className={`homekey-logo-lockup ${compact ? 'homekey-logo-lockup--compact' : ''} ${className}`.trim()} aria-label={ariaLabel}>
    <img className="homekey-logo-lockup-image" src={HOMEKEY_LOGO_SRC} alt={ariaLabel} />
  </div>
);

export default HomeKeyLogoBadge;
