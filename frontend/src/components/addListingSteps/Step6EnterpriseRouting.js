/**
 * Step6EnterpriseRouting.js
 * path: frontend/src/components/addListingSteps/Step6EnterpriseRouting.js
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
        {/* ── Teal header ── */}
        <div className="wizard-teal-header">
            <div className="wizard-teal-header__inner">
                <HeaderGlyph />
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                        <p className="wizard-teal-header__title">Command control</p>
                        <span className="wizard-teal-header__counter">{`Step ${stepNumber} of ${totalSteps}`}</span>
                    </div>
                    <p className="wizard-teal-header__subtitle">Configure lead routing, agent assignment, and boosters before launch</p>
                </div>
            </div>
            <div className="wizard-teal-header__progress">
                <div className="wizard-teal-header__progress-fill" style={{ width: '100%' }} />
            </div>
        </div>

        {/* ── Body ── */}
        <div className="wizard-body">
            {onboardingMethod === 'SyncPortfolio' ? (
                <div className="wizard-verified-pill">
                    <span aria-hidden="true">✓</span>
                    <span>{`Synced portfolio inventory: ${syncedPortfolioCount || listings.length} properties`}</span>
                </div>
            ) : null}

            <div className="wizard-section-card">
                <p className="wizard-section-label">Workspace agent performance</p>
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

            <div className="wizard-section-card">
                <p className="wizard-section-label">Live inventory routing</p>
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
                    onClick={onLaunch}
                    className="wizard-btn wizard-btn--full"
                >
                    Initialize Enterprise Connect Suite
                </button>
            </div>
        </div>
    </div>
);
