import React from 'react';

export const Step6EnterpriseRouting = ({
    agents,
    listings,
    syncedPortfolioCount,
    onboardingMethod,
    onAgentChange,
    onToggleBooster,
    prevStep,
    onLaunch,
    stepNumber = 6,
    totalSteps = 6,
}) => (
    <div className="wizard-step-card wizard-step-card--enterprise-final">
        <div className="wizard-progress-rail">
            <div className="wizard-progress-fill" style={{ width: '100%' }} />
        </div>
        <div className="wizard-step-header">
            <h2>{`Step ${stepNumber}: Command control`}</h2>
            <span className="wizard-step-counter">{`Step ${stepNumber} of ${totalSteps}`}</span>
        </div>

        <p className="wizard-step-note">
            Configure lead routing, agent assignment, and booster toggles before enterprise launch.
        </p>

        {onboardingMethod === 'SyncPortfolio' ? (
            <div className="wizard-verified-pill">
                <span aria-hidden="true">✓</span>
                <span>{`Synced portfolio inventory: ${syncedPortfolioCount || listings.length} properties`}</span>
            </div>
        ) : null}

        <div className="wizard-enterprise-section">
            <h3 className="wizard-enterprise-title">Workspace agent performance</h3>
            <div className="wizard-agent-grid">
                {agents.map((agent) => (
                    <div key={agent.id} className="wizard-agent-card">
                        <p className="wizard-agent-name">{agent.name}</p>
                        <p className="wizard-agent-stat">{`Leads: ${agent.leadsPassed}`}</p>
                        <p className="wizard-agent-stat">{`Conversion: ${agent.conversionRate}`}</p>
                        <p className="wizard-agent-stat">{`Active properties: ${agent.activeProperties}`}</p>
                    </div>
                ))}
            </div>
        </div>

        <div className="wizard-enterprise-section">
            <h3 className="wizard-enterprise-title">Live inventory routing</h3>
            <div className="wizard-routing-table">
                <div className="wizard-routing-header">
                    <span>Address</span>
                    <span>Leads</span>
                    <span>Assigned Agent</span>
                    <span>Booster</span>
                </div>
                {listings.map((listing) => (
                    <div key={listing.id} className="wizard-routing-row">
                        <span>{listing.address}</span>
                        <span className="wizard-routing-leads">{listing.leadsCount}</span>
                        <select
                            value={listing.assignedAgentId}
                            onChange={(event) => onAgentChange(listing.id, event.target.value)}
                            className="wizard-select"
                        >
                            {agents.map((agent) => (
                                <option key={agent.id} value={agent.id}>
                                    {agent.name}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => onToggleBooster(listing.id)}
                            className={`wizard-pill-toggle ${listing.boosterActive ? 'is-active' : ''}`}
                        >
                            {listing.boosterActive ? 'Pulsing active' : 'Activate boost'}
                        </button>
                    </div>
                ))}
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
                onClick={onLaunch}
                className="wizard-btn wizard-btn--full"
            >
                Initialize Enterprise Connect Suite
            </button>
        </div>
    </div>
);
