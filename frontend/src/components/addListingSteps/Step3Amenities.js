/**
 * Step3Amenities.js
 * path: frontend/src/components/addListingSteps/Step3Amenities.js
 */
import React from 'react';

// Same SVG icon paths as FilterMenu.js / Roommates section — one consistent vocabulary
const ICONS = {
    shield: (<><path d="M12 3 5.5 5.5v5.4c0 4.1 2.6 7.9 6.5 9.1 3.9-1.2 6.5-5 6.5-9.1V5.5L12 3Z" /><path d="M9.5 12.1 11.3 14l3.4-4" /></>),
    elevator: (<><path d="M7 3h10v18H7z" /><path d="M12 3v18" /><path d="m9.2 8 1.8-2 1.8 2" /><path d="m14.8 16-1.8 2-1.8-2" /></>),
    parking: (<><path d="M6 14.5h12l-1.3-4.2A2 2 0 0 0 14.8 9H9.2a2 2 0 0 0-1.9 1.3L6 14.5Z" /><path d="M7.5 14.5v3" /><path d="M16.5 14.5v3" /><path d="M8 17.5h1.3" /><path d="M14.7 17.5H16" /><path d="M8.5 12.5h7" /></>),
    pets: (<><path d="M8.4 10.3c1 0 1.8-1 1.8-2.2S9.4 6 8.4 6 6.6 7 6.6 8.1s.8 2.2 1.8 2.2Z" /><path d="M15.6 10.3c1 0 1.8-1 1.8-2.2S16.6 6 15.6 6s-1.8 1-1.8 2.1.8 2.2 1.8 2.2Z" /><path d="M5.6 14.4c.9 0 1.6-.8 1.6-1.9 0-1-.7-1.9-1.6-1.9S4 11.5 4 12.5c0 1.1.7 1.9 1.6 1.9Z" /><path d="M18.4 14.4c.9 0 1.6-.8 1.6-1.9 0-1-.7-1.9-1.6-1.9s-1.6.9-1.6 1.9c0 1.1.7 1.9 1.6 1.9Z" /><path d="M8.2 15.5c.9-2 2.1-3 3.8-3s2.9 1 3.8 3c.7 1.6-.3 3.1-2.1 2.8-.6-.1-1.1-.3-1.7-.3s-1.1.2-1.7.3c-1.8.3-2.8-1.2-2.1-2.8Z" /></>),
    accessibility: (<><path d="M12 5.2a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z" /><path d="M5.5 8.2 12 7l6.5 1.2" /><path d="M12 7v5.2" /><path d="M9 21l3-8.8L15 21" /><path d="M9.8 15.5h4.4" /></>),
    renovated: (<><path d="M4 14.5h9.5" /><path d="M13.5 11.5v6" /><path d="M13.5 12.2 18 7.7a2 2 0 0 1 2.8 2.8L16.3 15" /><path d="M4 17.5h4.5" /><path d="M5.5 6.5h5" /><path d="M8 4v5" /></>),
    furnished: (<><path d="M5 12.5V10a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v2.5" /><path d="M4 12.5h16v5H4z" /><path d="M6 17.5V20" /><path d="M18 17.5V20" /><path d="M8 12.5v-2" /><path d="M16 12.5v-2" /></>),
    oven: (<><path d="M6 4h12v16H6z" /><path d="M6 8h12" /><path d="M9 6h.1" /><path d="M12 6h.1" /><path d="M15 6h.1" /><path d="M9 11h6v5H9z" /></>),
    balcony: (<><path d="M6 5h12v8H6z" /><path d="M4 13h16" /><path d="M6 13v6" /><path d="M10 13v6" /><path d="M14 13v6" /><path d="M18 13v6" /><path d="M4 19h16" /></>),
    stovetop: (<><path d="M5 5h14v14H5z" /><path d="M9 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /><path d="M15 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /><path d="M9 17.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="M15 17.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></>),
    washer: (<><path d="M7 3.5h10v17H7z" /><path d="M7 7.5h10" /><path d="M10 5.5h.1" /><path d="M13 5.5h.1" /><path d="M12 17.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M9.6 14.1c1.5 1.1 3.3-1.1 4.8 0" /></>),
};

const AmenityIcon = ({ name }) => (
    <svg viewBox="0 0 24 24" focusable="false" width={28} height={28}
        style={{ width: 28, height: 28, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
        {ICONS[name]}
    </svg>
);

// Canonical amenity list — identical vocabulary to the Roommates wizard
const ALL_AMENITIES = [
    { id: 'mamad',              label: 'Mamad',                  icon: 'shield' },
    { id: 'elevator',           label: 'Elevator',               icon: 'elevator' },
    { id: 'parking',            label: 'Parking',                icon: 'parking' },
    { id: 'pets',               label: 'Pets Allowed',           icon: 'pets' },
    { id: 'disabled-access',    label: 'Disabled Access',        icon: 'accessibility' },
    { id: 'renovated',          label: 'Renovated',              icon: 'renovated' },
    { id: 'furnished',          label: 'Furnished',              icon: 'furnished' },
    { id: 'oven',               label: 'Oven',                   icon: 'oven' },
    { id: 'balcony',            label: 'Balcony',                icon: 'balcony' },
    { id: 'stovetop',           label: 'Stovetop',               icon: 'stovetop' },
    { id: 'in-unit-washer-dryer', label: 'In-Unit Washer & Dryer', icon: 'washer' },
];

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
    const nextStepLabel = Math.min(stepNumber + 1, totalSteps);
    const headingText = isEnterpriseTrack
        ? `Step ${stepNumber}: Global amenities baseline`
        : `Step ${stepNumber}: Amenities`;

    const toggleAmenity = (label) => {
        const current = data.amenities || [];
        const updated = current.includes(label)
            ? current.filter((item) => item !== label)
            : [...current, label];
        updateData({ amenities: updated });
    };

    return (
        <div className="wizard-step-card">
            <div className="wizard-progress-rail">
                <div className="wizard-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="wizard-step-header">
                <h2>{headingText}</h2>
                <span className="wizard-step-counter">{`Step ${stepNumber} of ${totalSteps}`}</span>
            </div>

            <div className="wizard-amenities-grid">
                {ALL_AMENITIES.map((item) => {
                    const isSelected = (data.amenities || []).includes(item.label);
                    return (
                        <button
                            type="button"
                            key={item.id}
                            onClick={() => toggleAmenity(item.label)}
                            className={`wizard-amenity ${isSelected ? 'is-selected' : ''}`}
                            aria-pressed={isSelected}
                        >
                            <AmenityIcon name={item.icon} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="wizard-actions">
                <button type="button" onClick={prevStep} className="wizard-btn wizard-btn--ghost">
                    Back
                </button>
                <button type="button" onClick={nextStep} className="wizard-btn wizard-btn--full">
                    {`Continue to Step ${nextStepLabel}`}
                </button>
            </div>
        </div>
    );
};
