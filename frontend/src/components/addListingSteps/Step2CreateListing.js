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
    <div className="rw-step-card">
      <div className="rw-progress-rail">
        <div className="rw-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="rw-step-header">
        <h2 className="rw-step-title">Create your listing</h2>
        <span className="rw-step-counter">Step {stepNumber} of {totalSteps}</span>
      </div>

      {/* Address confirmation pill */}
      <div className="rw-address-confirmed">
        <span aria-hidden="true">✓</span>
        <span>{addressLine || 'Address missing'}</span>
      </div>

      {/* Bedrooms */}
      <div className="rw-field">
        <label className="rw-label">Bedrooms</label>
        <ToggleGroup options={BEDROOM_OPTIONS} value={data.bedrooms}
          onChange={(val) => updateData({ bedrooms: val })} />
      </div>

      {/* Bathrooms */}
      <div className="rw-field">
        <label className="rw-label">Bathrooms</label>
        <ToggleGroup options={BATHROOM_OPTIONS} value={data.bathrooms}
          onChange={(val) => updateData({ bathrooms: val })} />
      </div>

      {/* Size + Floor */}
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

      {/* Price + Deposit */}
      <div className="rw-field-row">
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

      {/* Date + Lease */}
      <div className="rw-field-row">
        <div className={`rw-field ${errors.dateAvailable ? 'rw-field--error' : ''}`}>
          <label className="rw-label">Date available <span className="rw-label-required">*</span></label>
          <input type="date" className={`rw-input ${errors.dateAvailable ? 'rw-input--error' : ''}`}
            value={data.dateAvailable}
            onChange={(e) => updateData({ dateAvailable: e.target.value })} />
          {errors.dateAvailable && <p className="rw-field-error">{errors.dateAvailable}</p>}
        </div>
        <div className="rw-field">
          <label className="rw-label">Lease (months)</label>
          <input type="text" className="rw-input" placeholder="ex. 12"
            value={data.leaseLength} onChange={(e) => updateData({ leaseLength: e.target.value })} />
        </div>
      </div>

      {/* Description */}
      <div className="rw-field">
        <label className="rw-label">Description</label>
        <p className="rw-hint">Highlight unique features, lifestyle, and what makes this property special</p>
        <textarea className="rw-textarea" rows={4}
          placeholder="Bright apartment with sea views, renovated kitchen, and a large balcony..."
          maxLength={7000} value={data.description}
          onChange={(e) => updateData({ description: e.target.value })} />
        <p className="rw-char-count">{(data.description?.length || 0)}/7000</p>
      </div>

      <div className="rw-actions">
        <button type="button" onClick={prevStep} className="rw-btn rw-btn--ghost">Back</button>
        <button type="button" onClick={handleNext} className="rw-btn rw-btn--primary">
          Continue to Step {Math.min(stepNumber + 1, totalSteps)}
        </button>
      </div>
    </div>
  );
};
