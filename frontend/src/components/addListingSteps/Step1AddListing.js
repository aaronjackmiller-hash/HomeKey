import React from 'react';

const ApartmentIcon = () => (
    <svg viewBox="0 0 120 86" className="wizard-property-illustration" aria-hidden="true">
        <rect x="20" y="16" width="60" height="54" rx="4" fill="#ced9e3" stroke="#7d92a4" strokeWidth="2" />
        <rect x="80" y="28" width="20" height="42" rx="3" fill="#dce6ef" stroke="#8ca0b2" strokeWidth="2" />
        <rect x="42" y="52" width="16" height="18" rx="2" fill="#8fa4b7" />
        {[28, 40, 52].map((y) => (
            <g key={y}>
                <rect x="28" y={y} width="10" height="8" rx="1.5" fill="#ffffff" stroke="#8ca0b2" />
                <rect x="44" y={y} width="10" height="8" rx="1.5" fill="#ffffff" stroke="#8ca0b2" />
                <rect x="60" y={y} width="10" height="8" rx="1.5" fill="#ffffff" stroke="#8ca0b2" />
            </g>
        ))}
        <rect x="86" y="36" width="8" height="7" rx="1.2" fill="#ffffff" stroke="#8ca0b2" />
        <rect x="86" y="48" width="8" height="7" rx="1.2" fill="#ffffff" stroke="#8ca0b2" />
        <rect x="86" y="60" width="8" height="7" rx="1.2" fill="#ffffff" stroke="#8ca0b2" />
        <path d="M14 73h95" stroke="#8ca0b2" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const HouseIcon = () => (
    <svg viewBox="0 0 120 86" className="wizard-property-illustration" aria-hidden="true">
        <ellipse cx="61" cy="74" rx="47" ry="6" fill="#d7e3d0" />
        <path d="M20 42 59 17 99 42v31H20z" fill="#f5f2ea" stroke="#9ba29a" strokeWidth="2" />
        <path d="M16 44 59 11l44 33" fill="none" stroke="#7e8b93" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="50" y="50" width="16" height="23" rx="2" fill="#9cb0c1" />
        <rect x="30" y="50" width="12" height="10" rx="1.4" fill="#ffffff" stroke="#94a3b8" />
        <rect x="76" y="50" width="12" height="10" rx="1.4" fill="#ffffff" stroke="#94a3b8" />
        <path d="M99 58c0-7 5-11 10-11s10 4 10 11-5 14-10 14-10-7-10-14z" transform="translate(-5 0)" fill="#8dc18e" stroke="#679c6a" strokeWidth="2" />
        <rect x="103" y="58" width="3" height="15" rx="1" fill="#6a8b67" />
    </svg>
);

export const Step1AddListing = ({ data, updateData, nextStep }) => {
    const relationSelected = String(data.relation || '').trim().length > 0;
    const requiresBrokerDetails = data.relation === 'agent/broker';
    const isBrokerDetailsReady = Boolean(
        String(data.licenseNumber || '').trim()
        && String(data.agencyName || '').trim()
        && String(data.brokerFee || '').trim()
    );

    const isReadyToContinue = Boolean(
        data.propertyType
        && data.listingType
        && data.lookingForRoommates !== null
        && String(data.address.street || '').trim()
        && String(data.address.number || '').trim()
        && String(data.address.city || '').trim()
        && relationSelected
        && (!requiresBrokerDetails || isBrokerDetailsReady)
    );

    const handleContinue = () => {
        if (!isReadyToContinue) {
            return;
        }
        nextStep();
    };

    return (
        <div className="wizard-step-card">
            <div className="wizard-progress-rail">
                <div className="wizard-progress-fill" style={{ width: '20%' }} />
            </div>
            <div className="wizard-step-header">
                <h2>Step 1: Add your listing</h2>
                <span className="wizard-step-counter">Step 1 of 5</span>
            </div>

            <div className="wizard-row">
                <label className="wizard-label">Property Type</label>
                <div className="wizard-card-grid">
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
            </div>

            <div className="wizard-step1-grid-two">
                <div className="wizard-row">
                    <label className="wizard-label">Rental/Sale</label>
                    <select
                        value={data.listingType}
                        onChange={(e) => updateData({ listingType: e.target.value })}
                        className="wizard-select"
                    >
                        <option value="">Select...</option>
                        <option value="Rental">Rental</option>
                        <option value="For Sale">For Sale</option>
                    </select>
                </div>

                <div className="wizard-row wizard-roommate-box">
                    <label className="wizard-sub-label">Are you looking for roommates? (Required)</label>
                    <select
                        value={data.lookingForRoommates === null ? '' : (data.lookingForRoommates ? 'Yes' : 'No')}
                        onChange={(e) => updateData({
                            lookingForRoommates: e.target.value === ''
                                ? null
                                : e.target.value === 'Yes',
                        })}
                        className="wizard-select"
                    >
                        <option value="">Select...</option>
                        <option value="Yes">Yes, searching</option>
                        <option value="No">No, not searching</option>
                    </select>
                </div>
            </div>

            <div className="wizard-row">
                <label className="wizard-label">Address</label>
                <div className="wizard-address-grid wizard-address-grid--step1">
                    <input
                        type="text"
                        placeholder="Street"
                        value={data.address.street}
                        onChange={(e) => updateData({ address: { ...data.address, street: e.target.value } })}
                        className="wizard-input"
                    />
                    <input
                        type="text"
                        placeholder="No."
                        value={data.address.number}
                        onChange={(e) => updateData({ address: { ...data.address, number: e.target.value } })}
                        className="wizard-input"
                    />
                    <input
                        type="text"
                        placeholder="City"
                        value={data.address.city}
                        onChange={(e) => updateData({ address: { ...data.address, city: e.target.value } })}
                        className="wizard-input"
                    />
                </div>
            </div>

            <div className="wizard-row">
                <label className="wizard-label">Listing Relation</label>
                <select
                    value={data.relation}
                    onChange={(e) => updateData({ relation: e.target.value })}
                    className="wizard-select"
                >
                    <option value="">Select option...</option>
                    <option value="renter">Renter</option>
                    <option value="property owner">Property Owner</option>
                    <option value="agent/broker">Agent/Broker listing on someone&apos;s behalf</option>
                    <option value="property manager">Property Manager</option>
                </select>
            </div>

            {data.relation && data.relation !== 'renter' ? (
                <div className="wizard-relation-panel">
                    <p className="wizard-relation-title">Verification &amp; Professional Details</p>

                    {data.relation === 'property owner' ? (
                        <div className="wizard-row">
                            <label className="wizard-field-label">Property Verification Document (Tabu/ID) — optional</label>
                            <label className="wizard-file-upload">
                                <input
                                    type="file"
                                    accept=".pdf,image/*"
                                    onChange={(e) => updateData({ verificationDocument: e.target.files?.[0] || null })}
                                />
                                <span>Upload verification file</span>
                            </label>
                            {data.verificationDocument ? (
                                <p className="wizard-file-name">{data.verificationDocument.name}</p>
                            ) : null}
                        </div>
                    ) : null}

                    {data.relation === 'agent/broker' ? (
                        <div className="wizard-relation-grid">
                            <div className="wizard-field">
                                <label className="wizard-field-label">License Number *</label>
                                <input
                                    type="text"
                                    className="wizard-input"
                                    value={data.licenseNumber}
                                    onChange={(e) => updateData({ licenseNumber: e.target.value })}
                                    placeholder="e.g. BR-12345"
                                />
                            </div>
                            <div className="wizard-field">
                                <label className="wizard-field-label">Agency Name *</label>
                                <input
                                    type="text"
                                    className="wizard-input"
                                    value={data.agencyName}
                                    onChange={(e) => updateData({ agencyName: e.target.value })}
                                    placeholder="Agency or brokerage"
                                />
                            </div>
                            <div className="wizard-field wizard-relation-grid-full">
                                <label className="wizard-field-label">Broker Fee (₪ or %) *</label>
                                <input
                                    type="text"
                                    className="wizard-input"
                                    value={data.brokerFee}
                                    onChange={(e) => updateData({ brokerFee: e.target.value })}
                                    placeholder="e.g. ₪4,000 or 2%"
                                />
                            </div>
                        </div>
                    ) : null}

                    {data.relation === 'property manager' ? (
                        <div className="wizard-relation-grid">
                            <div className="wizard-field">
                                <label className="wizard-field-label">Management Company Name</label>
                                <input
                                    type="text"
                                    className="wizard-input"
                                    value={data.managementCompanyName}
                                    onChange={(e) => updateData({ managementCompanyName: e.target.value })}
                                    placeholder="Company name"
                                />
                            </div>
                            <div className="wizard-field">
                                <label className="wizard-field-label">Emergency Maintenance Phone</label>
                                <input
                                    type="tel"
                                    className="wizard-input"
                                    value={data.emergencyMaintenancePhone}
                                    onChange={(e) => updateData({ emergencyMaintenancePhone: e.target.value })}
                                    placeholder="Phone number"
                                />
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}

            <button
                type="button"
                onClick={handleContinue}
                className="wizard-btn wizard-btn--full"
                disabled={!isReadyToContinue}
            >
                Continue to Step 2
            </button>
            {!isReadyToContinue ? (
                <p className="wizard-step-note">
                    Please complete all required Step 1 fields before continuing.
                </p>
            ) : null}
        </div>
    );
};
