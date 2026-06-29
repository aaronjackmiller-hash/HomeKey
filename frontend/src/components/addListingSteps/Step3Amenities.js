/**
 * Step3Amenities.js
 * path: frontend/src/components/addListingSteps/Step3Amenities.js
 *
 * 100% inline styles — emoji icons, horizontal layout, 3-column grid.
 * Identical visual to all other amenity grids in the app.
 */
import React from 'react';

const ALL_AMENITIES = [
  { id: 'Mamad',                  label: 'Mamad',        icon: '🛡️' },
  { id: 'Elevator',               label: 'Elevator',     icon: '🛗' },
  { id: 'Parking',                label: 'Parking',      icon: '🚗' },
  { id: 'Pets Allowed',           label: 'Pets OK',      icon: '🐾' },
  { id: 'Disabled Access',        label: 'Accessible',   icon: '♿' },
  { id: 'Renovated',              label: 'Renovated',    icon: '🔨' },
  { id: 'Furnished',              label: 'Furnished',    icon: '🛋️' },
  { id: 'Oven',                   label: 'Oven',         icon: '🍳' },
  { id: 'Balcony',                label: 'Balcony',      icon: '🌇' },
  { id: 'Stovetop',               label: 'Stovetop',     icon: '🔥' },
  { id: 'In-Unit Washer & Dryer', label: 'Washer/Dryer', icon: '🌀' },
  { id: 'Dishwasher',             label: 'Dishwasher',   icon: '🍽️' },
];

const TEAL = '#2d6b5e';
const GRAY_BORDER = '#e5e7eb';

export const Step3Amenities = ({
  data,
  updateData,
  nextStep,
  prevStep,
  stepNumber = 3,
  totalSteps = 5,
  progressPercent = 60,
  isEnterpriseTrack = false,
}) => {
  const toggle = (id) => {
    const current = data.amenities || [];
    updateData({
      amenities: current.includes(id)
        ? current.filter((a) => a !== id)
        : [...current, id],
    });
  };

  return (
    <div className="rw-step-card">
      <div className="rw-progress-rail">
        <div className="rw-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="rw-step-header">
        <h2 className="rw-step-title">
          {isEnterpriseTrack ? 'Global amenities baseline' : 'Amenities'}
        </h2>
        <span className="rw-step-counter">Step {stepNumber} of {totalSteps}</span>
      </div>
      <p className="rw-hint" style={{ marginBottom: '4px' }}>
        Select everything that applies — helps buyers and renters find you faster.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {ALL_AMENITIES.map((item) => {
          const isSelected = (data.amenities || []).includes(item.id);
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => toggle(item.id)}
              aria-pressed={isSelected}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px',
                border: `1.5px solid ${isSelected ? TEAL : GRAY_BORDER}`,
                borderRadius: '10px',
                background: isSelected ? TEAL : '#fff',
                color: isSelected ? '#fff' : '#6b7280',
                fontSize: '13px', fontWeight: '600',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'all 0.15s ease',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '17px', lineHeight: 1, flexShrink: 0 }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="rw-actions">
        <button type="button" onClick={prevStep} className="rw-btn rw-btn--ghost">Back</button>
        <button type="button" onClick={nextStep} className="rw-btn rw-btn--primary">
          Continue to Step {Math.min(stepNumber + 1, totalSteps)}
        </button>
      </div>
    </div>
  );
};
