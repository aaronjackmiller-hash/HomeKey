import React from 'react';

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
            <div className="wizard-progress-rail">
                <div className="wizard-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="wizard-step-header">
                <h2>{`Step ${stepNumber}: Connect your feed`}</h2>
                <span className="wizard-step-counter">{`Step ${stepNumber} of ${totalSteps}`}</span>
            </div>

            <p className="wizard-step-note">
                Provide your agency website URL or public Yad2 business page to sync your enterprise portfolio.
            </p>

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

            <div className="wizard-actions">
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
    );
};
