import React from 'react';

export const Step2EnterpriseModel = ({
    data,
    updateData,
    onContinue,
    prevStep,
    totalSteps = 6,
}) => {
    const [selectedMethod, setSelectedMethod] = React.useState(data.onboardingMethod || '');
    const [showRequiredHint, setShowRequiredHint] = React.useState(false);
    const hasSelection = Boolean(selectedMethod);
    const progressPercent = Math.round((2 / totalSteps) * 100);
    const continueLabel = 'Continue to Step 3';

    React.useEffect(() => {
        setSelectedMethod(data.onboardingMethod || '');
    }, [data.onboardingMethod]);

    const handleContinue = () => {
        setShowRequiredHint(true);
        if (!hasSelection) {
            return;
        }
        onContinue(selectedMethod);
    };

    return (
        <div className="wizard-step-card">
            <div className="wizard-progress-rail">
                <div className="wizard-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="wizard-step-header">
                <h2>Step 2: Enterprise model</h2>
                <span className="wizard-step-counter">{`Step 2 of ${totalSteps}`}</span>
            </div>

            <p className="wizard-step-note" style={{ marginTop: 0 }}>
                Property Manager listings use enterprise onboarding. Choose how you want to start.
            </p>

            <div className="wizard-row">
                <label className="wizard-field-label">Onboarding Method</label>
                <select
                    value={selectedMethod}
                    onChange={(e) => {
                        const nextValue = e.target.value;
                        setSelectedMethod(nextValue);
                        updateData({ onboardingMethod: nextValue });
                    }}
                    className={`wizard-select ${showRequiredHint && !hasSelection ? 'wizard-field-required' : ''}`}
                >
                    <option value="">{showRequiredHint && !hasSelection ? 'Required' : 'Select onboarding method...'}</option>
                    <option value="SyncPortfolio">Sync portfolio from external feed</option>
                    <option value="AddManualSingle">Add one listing manually</option>
                </select>
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
                    onClick={handleContinue}
                    className="wizard-btn wizard-btn--full"
                >
                    {continueLabel}
                </button>
            </div>
        </div>
    );
};
