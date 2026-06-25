/**
 * Step1AddListing.js
 * path: frontend/src/components/addListingSteps/Step1AddListing.js
 */
import React from 'react';

const ApartmentIcon = () => (
    <div className="wizard-property-illustration wizard-property-illustration--apartment" aria-hidden="true">
        <svg viewBox="8 22 84 66" style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
            <g fill="none" stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 20 85 L 20 42 L 40 42 L 40 85" fill="#EAECEE" />
                <rect x="25" y="50" width="10" height="6" fill="#AED6F1" strokeWidth="1" />
                <rect x="25" y="64" width="10" height="6" fill="#AED6F1" strokeWidth="1" />
                <rect x="25" y="75" width="10" height="6" fill="#AED6F1" strokeWidth="1" />
                <path d="M 60 85 L 60 47 L 80 47 L 80 85" fill="#EAECEE" />
                <rect x="65" y="55" width="10" height="6" fill="#AED6F1" strokeWidth="1" />
                <rect x="65" y="70" width="10" height="6" fill="#AED6F1" strokeWidth="1" />
                <path d="M 38 85 L 38 30 L 62 30 L 62 85" fill="#F4F6F7" />
                <line x1="36" y1="30" x2="64" y2="30" />
                <rect x="43" y="37" width="6" height="8" fill="#AED6F1" strokeWidth="1" />
                <rect x="51" y="37" width="6" height="8" fill="#AED6F1" strokeWidth="1" />
                <rect x="43" y="49" width="6" height="8" fill="#AED6F1" strokeWidth="1" />
                <rect x="51" y="49" width="6" height="8" fill="#AED6F1" strokeWidth="1" />
                <rect x="43" y="61" width="6" height="8" fill="#AED6F1" strokeWidth="1" />
                <rect x="51" y="61" width="6" height="8" fill="#AED6F1" strokeWidth="1" />
                <rect x="47" y="73" width="6" height="12" fill="#34495E" />
                <line x1="10" y1="85" x2="90" y2="85" strokeWidth="2" />
            </g>
        </svg>
    </div>
);

const HouseIcon = () => (
    <div className="wizard-property-illustration wizard-property-illustration--house" aria-hidden="true">
        <svg viewBox="13 16 74 60" style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
            <g fill="none" stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 22 45 C 15 30, 45 20, 65 25 C 80 30, 85 45, 75 55 C 65 65, 30 60, 22 45 Z" fill="#EBF5FB" stroke="none" opacity="0.6" />
                <path d="M 75 42 C 70 30, 84 30, 84 42 C 84 52, 70 52, 75 42 Z" fill="#ABEBC6" />
                <line x1="77" y1="50" x2="77" y2="68" strokeWidth="1.2" />
                <path d="M 28 48 L 28 72 L 72 72 L 72 48" fill="#FDFEFE" />
                <polygon points="24,48 44,28 58,48" fill="#FDFEFE" />
                <path d="M 22 48 L 44 26 L 70 26 L 76 48 Z" fill="#34495E" />
                <rect x="62" y="20" width="5" height="10" fill="#34495E" />
                <line x1="61" y1="20" x2="68" y2="20" />
                <circle cx="41" cy="39" r="3.5" fill="#AED6F1" strokeWidth="1" />
                <line x1="41" y1="35.5" x2="41" y2="42.5" strokeWidth="0.7" />
                <line x1="37.5" y1="39" x2="44.5" y2="39" strokeWidth="0.7" />
                <rect x="34" y="54" width="14" height="10" fill="#AED6F1" strokeWidth="1.2" />
                <line x1="41" y1="54" x2="41" y2="64" strokeWidth="1" />
                <line x1="34" y1="59" x2="48" y2="59" strokeWidth="1" />
                <rect x="52" y="54" width="8" height="18" fill="#5D6D7E" />
                <rect x="64" y="54" width="10" height="10" fill="#AED6F1" strokeWidth="1.2" />
                <line x1="69" y1="54" x2="69" y2="64" strokeWidth="1" />
                <line x1="64" y1="59" x2="74" y2="59" strokeWidth="1" />
                <path d="M 20 72 C 20 64, 32 64, 32 72 Z" fill="#58D68D" />
                <line x1="15" y1="72" x2="85" y2="72" strokeWidth="2" />
            </g>
        </svg>
    </div>
);

export const Step1AddListing = ({ data, updateData, nextStep, stepNumber = 2, totalSteps: totalStepsProp }) => {
    const [showRequiredHints, setShowRequiredHints] = React.useState(false);
    const usesEnterpriseModel = data.relation === 'property manager';
    const usesSyncPortfolio = usesEnterpriseModel && data.onboardingMethod === 'SyncPortfolio';
    const derivedTotalSteps = usesSyncPortfolio ? 4 : (usesEnterpriseModel ? 7 : 6);
    const totalSteps = totalStepsProp != null ? totalStepsProp : derivedTotalSteps;
    const progressPercent = Math.round((stepNumber / totalSteps) * 100);

    const missingFields = {
        propertyType: !data.propertyType,
        listingType: !data.listingType,
        street: !String(data.address.street || '').trim(),
        number: !String(data.address.number || '').trim(),
        city: !String(data.address.city || '').trim(),
    };

    const hasMissingFields = Object.values(missingFields).some(Boolean);
    const formatRequiredPlaceholder = (basePlaceholder, isMissing) => (
        showRequiredHints && isMissing ? `${basePlaceholder} (required)` : basePlaceholder
    );

    const handleContinue = () => {
        setShowRequiredHints(true);
        if (hasMissingFields) return;
        nextStep();
    };

    return (
        <div className="wizard-step-card">
            <div className="wizard-progress-rail">
                <div className="wizard-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="wizard-step-header">
                <h2>{`Step ${stepNumber}: Add your listing`}</h2>
                <span className="wizard-step-counter">{`Step ${stepNumber} of ${totalSteps}`}</span>
            </div>

            {/* Property Type */}
            <div className="wizard-row">
                <label className="wizard-label">Property Type</label>
                <div className={`wizard-card-grid ${showRequiredHints && missingFields.propertyType ? 'wizard-card-grid--required' : ''}`}>
                    {['Apartment', 'House'].map((type) => (
                        <button
                            type="button"
                            key={type}
                            onClick={() => updateData({ propertyType: type })}
                            className={`wizard-property-card ${data.propertyType === type ? 'is-selected' : ''}`}
                        >
                            {type === 'Apartment' ? <ApartmentIcon /> : <HouseIcon />}
                            <span>{type}</span>
                        </button>
                    ))}
                </div>
                {showRequiredHints && missingFields.propertyType ? <p className="wizard-required-copy">Required</p> : null}
            </div>

            {/* Rental / Sale */}
            <div className="wizard-row">
                <label className="wizard-label">Rental / Sale</label>
                <select
                    value={data.listingType}
                    onChange={(e) => updateData({ listingType: e.target.value })}
                    className={`wizard-select ${showRequiredHints && missingFields.listingType ? 'wizard-field-required' : ''}`}
                >
                    <option value="">Select...</option>
                    <option value="Rental">For Rent</option>
                    <option value="For Sale">For Sale</option>
                </select>
                {showRequiredHints && missingFields.listingType ? <p className="wizard-required-copy">Required</p> : null}
            </div>

            {/* Address */}
            <div className="wizard-row">
                <label className="wizard-label">Address</label>
                <div className="wizard-address-grid wizard-address-grid--step1">
                    <input
                        type="text"
                        placeholder={formatRequiredPlaceholder('Street', missingFields.street)}
                        value={data.address.street}
                        onChange={(e) => updateData({ address: { ...data.address, street: e.target.value } })}
                        className={`wizard-input ${showRequiredHints && missingFields.street ? 'wizard-field-required' : ''}`}
                    />
                    <input
                        type="text"
                        placeholder={formatRequiredPlaceholder('No.', missingFields.number)}
                        value={data.address.number}
                        onChange={(e) => updateData({ address: { ...data.address, number: e.target.value } })}
                        className={`wizard-input ${showRequiredHints && missingFields.number ? 'wizard-field-required' : ''}`}
                    />
                    <input
                        type="text"
                        placeholder={formatRequiredPlaceholder('City', missingFields.city)}
                        value={data.address.city}
                        onChange={(e) => updateData({ address: { ...data.address, city: e.target.value } })}
                        className={`wizard-input ${showRequiredHints && missingFields.city ? 'wizard-field-required' : ''}`}
                    />
                </div>
            </div>

            <button type="button" onClick={handleContinue} className="wizard-btn wizard-btn--full">
                {usesEnterpriseModel ? 'Continue to Enterprise model' : `Continue to Step ${stepNumber + 1}`}
            </button>
        </div>
    );
};
