/**
 * Step2CreateListing.js
 * path: frontend/src/components/addListingSteps/Step2CreateListing.js
 */
import React from 'react';

export const Step2CreateListing = ({
    data,
    updateData,
    nextStep,
    prevStep,
    stepNumber = 2,
    totalSteps = 5,
    progressPercent = 40,
}) => {
    const nextStepLabel = Math.min(stepNumber + 1, totalSteps);

    return (
        <div className="wizard-step-card">
            <div className="wizard-progress-rail">
                <div className="wizard-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="wizard-step-header">
                <h2>{`Step ${stepNumber}: Create a listing`}</h2>
                <span className="wizard-step-counter">{`Step ${stepNumber} of ${totalSteps}`}</span>
            </div>

            <div className="wizard-verified-pill">
                <span aria-hidden="true">✓</span>
                <span>
                    {`${data.address.street || ''} ${data.address.number || ''}`.trim() || 'Address missing'}
                    {`, ${data.address.city || 'City missing'} (Verified)`}
                </span>
            </div>

            <div className="wizard-step2-grid">
                <div className="wizard-field">
                    <label className="wizard-field-label">Number of bedrooms</label>
                    <select
                        value={data.bedrooms}
                        onChange={(e) => updateData({ bedrooms: e.target.value })}
                        className="wizard-select"
                    >
                        {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={String(n)}>{n}</option>)}
                    </select>
                </div>
                <div className="wizard-field">
                    <label className="wizard-field-label">Number of bathrooms</label>
                    <select
                        value={data.bathrooms}
                        onChange={(e) => updateData({ bathrooms: e.target.value })}
                        className="wizard-select"
                    >
                        {[1, 2, 3, 4].map((n) => <option key={n} value={String(n)}>{n}</option>)}
                    </select>
                </div>

                <div className="wizard-field">
                    <label className="wizard-field-label">Size</label>
                    <div className="wizard-input-group">
                        <input
                            type="number"
                            placeholder="Size"
                            value={data.sizeSqm}
                            onChange={(e) => updateData({ sizeSqm: e.target.value })}
                            className="wizard-input wizard-input--with-suffix"
                        />
                        <span className="wizard-input-suffix">SQM</span>
                    </div>
                </div>
                <div className="wizard-field">
                    <label className="wizard-field-label">Date available</label>
                    <input
                        type="date"
                        value={data.dateAvailable}
                        onChange={(e) => updateData({ dateAvailable: e.target.value })}
                        className="wizard-input"
                    />
                </div>

                <div className="wizard-field">
                    <label className="wizard-field-label">Total Monthly Price</label>
                    <div className="wizard-input-group">
                        <span className="wizard-input-prefix">₪</span>
                        <input
                            type="text"
                            placeholder="ex. 2,500"
                            value={data.price}
                            onChange={(e) => updateData({ price: e.target.value })}
                            className="wizard-input wizard-input--with-prefix"
                        />
                    </div>
                </div>
                <div className="wizard-field">
                    <label className="wizard-field-label">Deposit</label>
                    <div className="wizard-input-group">
                        <span className="wizard-input-prefix">₪</span>
                        <input
                            type="text"
                            value={data.deposit}
                            onChange={(e) => updateData({ deposit: e.target.value })}
                            className="wizard-input wizard-input--with-prefix"
                        />
                    </div>
                </div>

                <div className="wizard-field">
                    <label className="wizard-field-label">Lease length</label>
                    <div className="wizard-input-group">
                        <input
                            type="text"
                            placeholder="ex. 12"
                            value={data.leaseLength}
                            onChange={(e) => updateData({ leaseLength: e.target.value })}
                            className="wizard-input wizard-input--with-suffix"
                        />
                        <span className="wizard-input-suffix">Months</span>
                    </div>
                </div>
                <div className="wizard-field">
                    <label className="wizard-field-label">Floor Number</label>
                    <input
                        type="number"
                        placeholder="Floor"
                        value={data.floorNumber}
                        onChange={(e) => updateData({ floorNumber: e.target.value })}
                        className="wizard-input"
                    />
                </div>
            </div>

            <div className="wizard-row" style={{ marginTop: '8px' }}>
                <label className="wizard-field-label">Description</label>
                <textarea
                    rows={4}
                    placeholder="Provide key details, unique features, and lifestyle potential"
                    maxLength={7000}
                    value={data.description}
                    onChange={(e) => updateData({ description: e.target.value })}
                    className="wizard-textarea"
                />
                <div className="wizard-char-counter">
                    {7000 - (data.description?.length || 0)} characters remaining
                </div>
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
