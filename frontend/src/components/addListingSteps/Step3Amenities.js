import React from 'react';

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

    const allAmenities = [
        { id: 'EL', label: 'Elevator' },
        { id: 'PK', label: 'Parking' },
        { id: 'PT', label: 'Pets Allowed' },
        { id: 'DA', label: 'Disabled Access' },
        { id: 'RN', label: 'Renovated' },
        { id: 'FR', label: 'Furnished' },
        { id: 'AC', label: 'Air Conditioning' },
        { id: 'WB', label: 'Bars on Windows' },
        { id: 'MP', label: 'Mirpeset (Balcony)' },
        { id: 'SU', label: 'Suitable for Partners' },
        { id: 'MM', label: 'The Mamad (Security Room)' },
    ];

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
                {allAmenities.map((item) => {
                    const isSelected = (data.amenities || []).includes(item.label);
                    return (
                        <button
                            type="button"
                            key={item.id}
                            onClick={() => toggleAmenity(item.label)}
                            className={`wizard-amenity ${isSelected ? 'is-selected' : ''}`}
                        >
                            <span className="wizard-amenity-code">
                                {item.id}
                            </span>
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="wizard-actions">
                <button
                    type="button"
                    onClick={prevStep}
                    className="wizard-btn wizard-btn--ghost"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={nextStep}
                    className="wizard-btn wizard-btn--full"
                >
                    {`Continue to Step ${nextStepLabel}`}
                </button>
            </div>
        </div>
    );
};
