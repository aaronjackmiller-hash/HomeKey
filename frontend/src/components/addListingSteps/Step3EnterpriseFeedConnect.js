/**
 * Step3EnterpriseFeedConnect.js
 * path: frontend/src/components/addListingSteps/Step3EnterpriseFeedConnect.js
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

export const Step3EnterpriseFeedConnect = ({
    feedUrl,
    onFeedUrlChange,
    syncedCount,
    onSyncComplete,
    prevStep,
    nextStep,
    stepNumber = 3,
    totalSteps = 6,
    progressPercent = 50,
}) => {
    const [syncState, setSyncState] = React.useState(syncedCount > 0 ? 'success' : 'idle');
    const [detectedCount, setDetectedCount] = React.useState(syncedCount || 0);
    const [errorMessage, setErrorMessage] = React.useState('');

    React.useEffect(() => {
        if (syncedCount > 0) {
            setDetectedCount(syncedCount);
            setSyncState('success');
        }
    }, [syncedCount]);

    const handleStartSync = (event) => {
        event.preventDefault();
        if (!feedUrl.trim()) {
            setErrorMessage('Feed source URL is required.');
            return;
        }

        setErrorMessage('');
        setSyncState('loading');

        window.setTimeout(() => {
            const mockDetectedCount = 18;
            setDetectedCount(mockDetectedCount);
            onSyncComplete(mockDetectedCount);
            setSyncState('success');
        }, 2500);
    };

    return (
        <div className="wizard-step-card">
            {/* ── Teal header ── */}
            <div className="wizard-teal-header">
                <div className="wizard-teal-header__inner">
                    <HeaderGlyph />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                            <p className="wizard-teal-header__title">Connect your feed</p>
                            <span className="wizard-teal-header__counter">{`Step ${stepNumber} of ${totalSteps}`}</span>
                        </div>
                        <p className="wizard-teal-header__subtitle">Provide your agency website or public Yad2 business page to sync your portfolio</p>
                    </div>
                </div>
                <div className="wizard-teal-header__progress">
                    <div className="wizard-teal-header__progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
            </div>

            {/* ── Body ── */}
            <div className="wizard-body">
                <div className="wizard-section-card">
                    <p className="wizard-section-label">Feed source</p>
                    <form onSubmit={handleStartSync} className="wizard-row">
                        <label className="wizard-field-label">Feed Source URL</label>
                        <div className="wizard-sync-row">
                            <input
                                type="url"
                                required
                                value={feedUrl}
                                placeholder="https://www.agency-jaffa.co.il/listings"
                                disabled={syncState === 'loading'}
                                onChange={(event) => onFeedUrlChange(event.target.value)}
                                className="wizard-input"
                            />
                            <button
                                type="submit"
                                disabled={syncState === 'loading' || syncState === 'success'}
                                className="wizard-btn"
                            >
                                {syncState === 'idle' ? 'Fetch & Sync' : null}
                                {syncState === 'loading' ? 'Connecting...' : null}
                                {syncState === 'success' ? 'Portfolio Linked' : null}
                            </button>
                        </div>
                    </form>

                    {errorMessage ? (
                        <p className="listing-wizard-status listing-wizard-status--error">{errorMessage}</p>
                    ) : null}

                    {syncState === 'loading' ? (
                        <div className="wizard-sync-message wizard-sync-message--loading">
                            Parsing external listings and building your local inventory footprint...
                        </div>
                    ) : null}

                    {syncState === 'success' ? (
                        <div className="wizard-sync-message wizard-sync-message--success">
                            Successfully indexed <strong>{detectedCount}</strong> active properties from your feed.
                        </div>
                    ) : null}
                </div>

                <div className="wizard-actions" style={{ paddingBottom: '4px' }}>
                    <button
                        type="button"
                        onClick={prevStep}
                        disabled={syncState === 'loading'}
                        className="wizard-btn wizard-btn--ghost"
                    >
                        Back
                    </button>
                    <button
                        type="button"
                        onClick={nextStep}
                        disabled={syncState !== 'success'}
                        className="wizard-btn wizard-btn--full"
                    >
                        Continue to Step 4
                    </button>
                </div>
            </div>
        </div>
    );
};
