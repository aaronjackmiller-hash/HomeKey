import React, { useState } from 'react';

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3.3" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M3 3 21 21"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.9 5.1A11.54 11.54 0 0 1 12 4.5c6.5 0 10.5 7.5 10.5 7.5a20.88 20.88 0 0 1-4.06 5.18M14.2 14.2A3.3 3.3 0 0 1 9.8 9.8"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.5 6.5A19.12 19.12 0 0 0 1.5 12S5.5 19.5 12 19.5a11.2 11.2 0 0 0 4.24-.78"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PasswordField = ({
  label,
  name,
  value,
  onChange,
  required = false,
  minLength,
  disabled = false,
  autoComplete = 'current-password',
  id,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const inputId = id || name;
  const toggleLabel = isVisible ? `Hide ${String(label || 'password').toLowerCase()}` : `Show ${String(label || 'password').toLowerCase()}`;

  return (
    <div className="input-field password-input-field">
      <label htmlFor={inputId}>{label}</label>
      <div className="password-input-wrapper">
        <input
          id={inputId}
          type={isVisible ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          minLength={minLength}
          disabled={disabled}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="password-visibility-toggle"
          onClick={() => setIsVisible((prev) => !prev)}
          disabled={disabled}
          aria-label={toggleLabel}
          aria-pressed={isVisible}
        >
          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
};

export default PasswordField;
