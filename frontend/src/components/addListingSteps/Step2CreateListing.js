/**
 * Step2CreateListing.js
 * path: frontend/src/components/addListingSteps/Step2CreateListing.js
 *
 * Rebuilt to match RoommateWizard visual style — rw-* CSS classes,
 * toggle buttons for bedrooms/bathrooms instead of dropdowns.
 */
import React, { useState } from 'react';

const BEDROOM_OPTIONS = [
  { value: '1', label: '1' }, { value: '2', label: '2' },
  { value: '3', label: '3' }, { value: '4', label: '4+' },
];

const BATHROOM_OPTIONS = [
  { value: '1', label: '1' }, { value: '2', label: '2' },
  { value: '3', label: '3+' },
];

const ToggleGroup = ({ options, value, onChange }) => (
  <div className="rw-toggle-group" role="group">
    {options.map((opt) => (
      <button key={opt.value} type="button"
        className={`rw-toggle-btn ${value === opt.value ? 'is-active' : ''}`}
        onClick={() => onChange(opt.value)} aria-pressed={value === opt.value}>
        {opt.label}
      </button>
    ))}
  </div>
);

export const Step2CreateListing = ({
  data,
  updateData,
  nextStep,
  prevStep,
  stepNumber = 2,
  totalSteps = 5,
  progressPercent = 40,
}) => {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const next = {};
    const priceNum = Number(String(data.price || '').replace(/,/g, ''));
    if (!data.price || isNaN(priceNum) || priceNum <= 0) next.price = 'Please enter a valid price';
    if (!data.sizeSqm) next.sizeSqm = 'Please enter the apartment size';
    if (!data.dateAvailable) next.dateAvailable = 'Please select a date available';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleNext = () => { if (validate()) nextStep(); };

  const addressLine = [
    `${data.address.street || ''} ${data.address.number || ''}`.trim(),
    data.address.city,
  ].filter(Boolean).join(', ');

  return (
    <div className="wizard-step-card">
      {/* ── Teal header ── */}
      <div className="wizard-teal-header">
        <div className="wizard-teal-header__inner">
          <svg viewBox="0 0 72 72" width="60" height="60" focusable="false" aria-hidden="true" style={{ flexShrink: 0 }}>
            <rect x="4" y="28" width="64" height="36" rx="4" fill="#1f4f44"/>
            <polygon points="36,8 6,30 66,30" fill="#4a9b85"/>
            <rect x="14" y="36" width="14" height="14" rx="2" fill="#b8d8d0"/>
            <rect x="30" y="42" width="12" height="22" rx="2" fill="#4a9b85"/>
            <rect x="44" y="36" width="14" height="10" rx="2" fill="#b8d8d0"/>
            <circle cx="58" cy="20" r="6" fill="#f0c040" opacity="0.8"/>
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
              <p className="wizard-teal-header__title">Create your listing</p>
              <span className="wizard-teal-header__counter">Step {stepNumber} of {totalSteps}</span>
            </div>
            <p className="wizard-teal-header__subtitle">
              {addressLine ? `📍 ${addressLine}` : 'Add the details that renters care about most'}
            </p>
          </div>
        </div>
        <div className="wizard-teal-header__progress">
          <div className="wizard-teal-header__progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="wizard-body">

        {/* Bedrooms & Bathrooms */}
        <div className="wizard-section-card">
          <p className="wizard-section-label">Bedrooms</p>
          <ToggleGroup options={BEDROOM_OPTIONS} value={data.bedrooms} onChange={(val) => updateData({ bedrooms: val })} />
          <p className="wizard-section-label" style={{ marginTop: '14px' }}>Bathrooms</p>
          <ToggleGroup options={BATHROOM_OPTIONS} value={data.bathrooms} onChange={(val) => updateData({ bathrooms: val })} />
        </div>

        {/* Size, Floor, Price, Deposit, Date, Lease */}
        <div className="wizard-section-card">
          <p className="wizard-section-label">Property details</p>
          <div className="rw-field-row">
            <div className={`rw-field ${errors.sizeSqm ? 'rw-field--error' : ''}`}>
              <label className="rw-label">Size (sqm) <span className="rw-label-required">*</span></label>
              <input type="number" className={`rw-input ${errors.sizeSqm ? 'rw-input--error' : ''}`}
                placeholder="75" min="0" value={data.sizeSqm}
                onChange={(e) => updateData({ sizeSqm: e.target.value })} />
              {errors.sizeSqm && <p className="rw-field-error">{errors.sizeSqm}</p>}
            </div>
            <div className="rw-field">
              <label className="rw-label">Floor</label>
              <input type="number" className="rw-input" placeholder="Floor"
                value={data.floorNumber} onChange={(e) => updateData({ floorNumber: e.target.value })} />
            </div>
          </div>
          <div className="rw-field-row" style={{ marginTop: '10px' }}>
            <div className={`rw-field ${errors.price ? 'rw-field--error' : ''}`}>
              <label className="rw-label">Monthly price (₪) <span className="rw-label-required">*</span></label>
              <input type="text" className={`rw-input ${errors.price ? 'rw-input--error' : ''}`}
                placeholder="ex. 5,000" value={data.price}
                onChange={(e) => updateData({ price: e.target.value })} />
              {errors.price && <p className="rw-field-error">{errors.price}</p>}
            </div>
            <div className="rw-field">
              <label className="rw-label">Deposit (₪)</label>
              <input type="text" className="rw-input" placeholder="ex. 10,000"
                value={data.deposit} onChange={(e) => updateData({ deposit: e.target.value })} />
            </div>
          </div>
          <div className="rw-field-row" style={{ marginTop: '10px' }}>
            <div className={`rw-field ${errors.dateAvailable ? 'rw-field--error' : ''}`}>
              <label className="rw-label">Date available <span className="rw-label-required">*</span></label>
              <input type="date" className={`rw-input ${errors.dateAvailable ? 'rw-input--error' : ''}`}
                value={data.dateAvailable} onChange={(e) => updateData({ dateAvailable: e.target.value })} />
              {errors.dateAvailable && <p className="rw-field-error">{errors.dateAvailable}</p>}
            </div>
            <div className="rw-field">
              <label className="rw-label">Lease (months)</label>
              <input type="text" className="rw-input" placeholder="ex. 12"
                value={data.leaseLength} onChange={(e) => updateData({ leaseLength: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="wizard-section-card">
          <p className="wizard-section-label">Description</p>
          <p className="rw-hint" style={{ marginBottom: '8px' }}>Highlight unique features, lifestyle, and what makes this property special</p>
          <textarea className="rw-textarea" rows={4}
            placeholder="Bright apartment with sea views, renovated kitchen, and a large balcony..."
            maxLength={7000} value={data.description}
            onChange={(e) => updateData({ description: e.target.value })} />
          <p className="rw-char-count">{(data.description?.length || 0)}/7000</p>
        </div>

        <div className="rw-actions" style={{ paddingBottom: '4px' }}>
          <button type="button" onClick={prevStep} className="rw-btn rw-btn--ghost">Back</button>
          <button type="button" onClick={handleNext} className="rw-btn rw-btn--primary">
            Continue to Step {Math.min(stepNumber + 1, totalSteps)}
          </button>
        </div>

      </div>
    </div>
  );
};
