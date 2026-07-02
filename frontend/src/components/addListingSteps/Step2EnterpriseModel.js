/**
 * Step2EnterpriseModel.js
 * path: frontend/src/components/addListingSteps/Step2EnterpriseModel.js
 */
import React from 'react';

const HeaderGlyph = () => (
    <svg viewBox="0 0 72 72" width="60" height="60" focusable="false" aria-hidden="true" style={{ flexShrink: 0 }}>
        <rect x="4" y="28" width="64" height="36" rx="4" fill="#1f4f44" />
        <polygon points="36,8 6,30 66,30" fill="#4a9b85" />
        <rect x="14" y="36" width="14" height="14" rx="2" fill="#b8d8d0" />
        <rect x="30" y="42" width="12" height="22" rx="2" fill="#4a9b85" />
        <rect x="44" y="36" width="14" height="10" rx="2" fill="#b8d8d0" />
        <circle cx="58" cy="20" r="6" fill="#f0c040" opacity="0.8" />
    </svg>
);

export const Step2EnterpriseModel = ({
    data,
    updateData,
    onContinue,
    prevStep,
    totalSteps = 7,
}) => {
    const [selectedMethod, setSelectedMethod] = React.useState(data.onboardingMethod || '');
    const [showRequiredHint, setShowRequiredHint] = React.useState(false);
    const hasSelection = Boolean(selectedMethod);
    const progressPercent = Math.round((3 / totalSteps) * 100);
    const continueLabel = 'Continue to Step 4';

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
            {/* ── Teal header ── */}
            <div className="wizard-teal-header">
                <div className="wizard-teal-header__inner">
                    <HeaderGlyph />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                            <p className="wizard-teal-header__title">Enterprise model</p>
                            <span className="wizard-teal-header__counter">{`Step 3 of ${totalSteps}`}</span>
                        </div>
                        <p className="wizard-teal-header__subtitle">Property Manager listings use enterprise onboarding — choose how to start</p>
                    </div>
                </div>
                <div className="wizard-teal-header__progress">
                    <div className="wizard-teal-header__progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
            </div>

            {/* ── Body ── */}
            <div className="wizard-body">
                <div className="wizard-section-card">
                    <p className="wizard-section-label">Onboarding method</p>
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
                    {showRequiredHint && !hasSelection ? <p className="wizard-required-copy">Required</p> : null}
                </div>

                <div className="wizard-actions" style={{ paddingBottom: '4px' }}>
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
        </div>
    );
};
