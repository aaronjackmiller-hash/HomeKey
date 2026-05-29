import React from 'react';

export const Step1AddListing = ({ data, updateData, nextStep }) => {
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
                            <span aria-hidden="true">{type === 'Apartment' ? '🏢' : '🏠'}</span>
                            <span>{type}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="wizard-row">
                <label className="wizard-label">Rental/Sale</label>
                <select
                    value={data.listingType}
                    onChange={(e) => updateData({ listingType: e.target.value })}
                    className="wizard-select"
                >
                    <option value="Rental">Rental</option>
                    <option value="For Sale">For Sale</option>
                </select>
            </div>

            <div className="wizard-row wizard-roommate-box">
                <label className="wizard-sub-label">Are you looking for roommates?</label>
                <select
                    value={data.lookingForRoommates ? 'Yes' : 'No'}
                    onChange={(e) => updateData({ lookingForRoommates: e.target.value === 'Yes' })}
                    className="wizard-select"
                >
                    <option value="Yes">Yes, searching</option>
                    <option value="No">No, not searching</option>
                </select>
            </div>

            <div className="wizard-row">
                <label className="wizard-label">Address</label>
                <div className="wizard-address-grid">
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

            <button
                type="button"
                onClick={nextStep}
                className="wizard-btn wizard-btn--full"
            >
                Continue to Step 2
            </button>
        </div>
    );
};
