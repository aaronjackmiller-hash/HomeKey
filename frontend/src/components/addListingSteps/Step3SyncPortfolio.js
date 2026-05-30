import React from 'react';
import { getPublicYad2SyncStatus, runYad2SyncNowForUser } from '../../services/api';

export const Step3SyncPortfolio = ({ prevStep, onDone, totalSteps = 3 }) => {
    const [statusLoading, setStatusLoading] = React.useState(false);
    const [syncLoading, setSyncLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [syncStatus, setSyncStatus] = React.useState(null);
    const [syncResult, setSyncResult] = React.useState(null);

    const applyStatusResponse = (response) => {
        if (response && typeof response === 'object' && response.status && typeof response.status === 'object') {
            setSyncStatus(response.status);
            return;
        }
        setSyncStatus(response || null);
    };

    const handleRefreshStatus = async () => {
        setError('');
        setStatusLoading(true);
        try {
            const response = await getPublicYad2SyncStatus();
            applyStatusResponse(response);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to load sync status.');
        } finally {
            setStatusLoading(false);
        }
    };

    const handleRunSyncNow = async () => {
        setError('');
        setSyncResult(null);
        setSyncLoading(true);
        try {
            const response = await runYad2SyncNowForUser();
            setSyncResult(response);
            const latestStatus = await getPublicYad2SyncStatus();
            applyStatusResponse(latestStatus);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Portfolio sync failed.');
        } finally {
            setSyncLoading(false);
        }
    };

    React.useEffect(() => {
        handleRefreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="wizard-step-card">
            <div className="wizard-progress-rail">
                <div className="wizard-progress-fill" style={{ width: '100%' }} />
            </div>
            <div className="wizard-step-header">
                <h2>Step 3: Sync portfolio</h2>
                <span className="wizard-step-counter">{`Step 3 of ${totalSteps}`}</span>
            </div>

            <p className="wizard-step-note">
                Run your portfolio sync to import connected listings instead of creating one manually.
            </p>

            {error ? <p className="listing-wizard-status listing-wizard-status--error">{error}</p> : null}

            <div className="wizard-actions" style={{ justifyContent: 'flex-start' }}>
                <button
                    type="button"
                    className="wizard-btn wizard-btn--ghost"
                    onClick={handleRefreshStatus}
                    disabled={statusLoading}
                >
                    {statusLoading ? 'Loading status...' : 'Refresh sync status'}
                </button>
                <button
                    type="button"
                    className="wizard-btn wizard-btn--full"
                    onClick={handleRunSyncNow}
                    disabled={syncLoading}
                >
                    {syncLoading ? 'Running sync...' : 'Run portfolio sync now'}
                </button>
            </div>

            {syncStatus ? (
                <div className="wizard-row">
                    <p className="wizard-step-note" style={{ marginTop: 0 }}>
                        {`Sync enabled: ${String(syncStatus.enabled)} | In progress: ${String(syncStatus.inFlight)} | Last run: ${syncStatus.lastFinishedAt || 'never'}`}
                    </p>
                </div>
            ) : null}

            {syncResult ? (
                <div className="wizard-row">
                    <p className="wizard-step-note" style={{ marginTop: 0 }}>
                        {syncResult.message || 'Portfolio sync completed.'}
                    </p>
                </div>
            ) : null}

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
                    onClick={onDone}
                    className="wizard-btn wizard-btn--full"
                >
                    Done
                </button>
            </div>
        </div>
    );
};
