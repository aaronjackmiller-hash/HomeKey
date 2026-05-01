import React from 'react';
import uploadedHomeKeyLogo from '../assets/homekey-logo-uploaded.png';

const HomeKeyLogoBadge = ({ compact = false, className = '', ariaLabel = 'HomeKey logo' }) => (
  <div className={`homekey-logo-lockup ${compact ? 'homekey-logo-lockup--compact' : ''} ${className}`.trim()} aria-label={ariaLabel}>
    <img className="homekey-logo-lockup-image" src={uploadedHomeKeyLogo} alt={ariaLabel} />
  </div>
);

export default HomeKeyLogoBadge;
