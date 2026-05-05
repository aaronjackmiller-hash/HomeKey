import React from 'react';
import uploadedHomeKeyLogo from '../assets/H Logo Gemini_Generated_Image_8ckrj88ckrj88ckr.png';

export const HOMEKEY_LOGO_SRC = uploadedHomeKeyLogo;

const HomeKeyLogoBadge = ({ compact = false, className = '', ariaLabel = 'HomeKey logo' }) => (
  <div className={`homekey-logo-lockup ${compact ? 'homekey-logo-lockup--compact' : ''} ${className}`.trim()} aria-label={ariaLabel}>
    <img className="homekey-logo-lockup-image" src={HOMEKEY_LOGO_SRC} alt={ariaLabel} />
  </div>
);

export default HomeKeyLogoBadge;
