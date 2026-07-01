/**
 * Step5PublishListing.js
 * path: frontend/src/components/addListingSteps/Step5PublishListing.js
 *
 * Always shows inline contact fields — no auth gating.
 * Pre-filled from auth account or localStorage.
 * Includes country code prefix pill matching RoommateWizard.
 */
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const CONTACT_CACHE_KEY = 'homekey:contact-info:v1';

const getStoredContact = () => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return {};
        const raw = window.localStorage.getItem(CONTACT_CACHE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (_err) { return {}; }
};

const saveStoredContact = ({ firstName, phone, email }) => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return;
        const existing = getStoredContact();
        window.localStorage.setItem(CONTACT_CACHE_KEY, JSON.stringify({ ...existing, firstName, phone, email }));
    } catch (_err) {}
};

const COUNTRY_CODES = [
    { code: '+972', flag: '🇮🇱', label: 'IL' },
    { code: '+1',   flag: '🇺🇸', label: 'US' },
    { code: '+44',  flag: '🇬🇧', label: 'UK' },
    { code: '+27',  flag: '🇿🇦', label: 'ZA' },
    { code: '+61',  flag: '🇦🇺', label: 'AU' },
    { code: '+1',   flag: '🇨🇦', label: 'CA' },
    { code: '+33',  flag: '🇫🇷', label: 'FR' },
    { code: '+49',  flag: '🇩🇪', label: 'DE' },
];

export const Step5PublishListing = ({
    data,
    prevStep,
    onPublishFinished,
    stepNumber = 5,
    totalSteps = 5,
}) => {
    const { isAuthenticated, user } = useAuth();
    const history = useHistory();
    const stored = getStoredContact();

    const [primaryImageSrc, setPrimaryImageSrc] = useState('');
    const [displayPhone, setDisplayPhone] = useState(true);
    const [countryCode, setCountryCode] = useState('+972');
    const [countryLabel, setCountryLabel] = useState('IL');
    const [contactFirstName, setContactFirstName] = useState(
        user?.name?.split(' ')[0] || stored.firstName || ''
    );
    const [localPhone, setLocalPhone] = useState(stored.phone || '');

    useEffect(() => {
        if (data.mediaFiles && data.mediaFiles.length > 0) {
            const objectUrl = URL.createObjectURL(data.mediaFiles[0]);
            setPrimaryImageSrc(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
        setPrimaryImageSrc('');
        return undefined;
    }, [data.mediaFiles]);

    useEffect(() => {
        if (isAuthenticated && user) {
            setContactFirstName(user.name?.split(' ')[0] || '');
            const rawPhone = user.phone || user.whatsapp || '';
            setLocalPhone(rawPhone.replace(/^\+\d{1,3}/, '').replace(/^0/, ''));
        }
    }, [isAuthenticated, user]);

    const transactionType = data.listingType === 'For Sale' ? 'Sale' : 'Rent';
    const propertyType = data.propertyType || 'Apartment';
    const city = data.address?.city || 'Tel Aviv';
    const consolidatedTitle = `${propertyType} for ${transactionType} — ${city}`;

    const fullPhone = `${countryCode}${localPhone.trim().replace(/^0/, '')}`;
    const canPublish = Boolean(localPhone.trim());

    const handlePublish = () => {
        const phone = fullPhone;
        if (!isAuthenticated) {
            saveStoredContact({ firstName: contactFirstName, phone, email: '' });
        }
        onPublishFinished({ anonPhone: phone, anonFirstName: contactFirstName });
    };

    return (
        <div className="wizard-step-card">
            {/* ── Teal header ── */}
            <div className="wizard-teal-header">
                <div className="wizard-teal-header__inner">
                    <svg viewBox="0 0 72 72" width="60" height="60" focusable="false" aria-hidden="true" style={{ flexShrink: 0 }}>
                        <rect x="4" y="28" width="64" height="36" rx="4" fill="#1f4f44"/>
                        <polygon points="36,8 6,30 66,30" fill="#4a9b85"/>
                        <rect x="14" y="36" width="14" height="14" rx="2" fill="#b8d8d0"/>
                        <rect x="30" y="42" width="12" height="22" rx="2" fill="#4a9b85"/>
                        <rect x="44" y="36" width="14" height="10" rx="2" fill="#b8d8d0"/>
                        <circle cx="58" cy="20" r="6" fill="#f0c040" opacity="0.8"/>
                    </svg>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                            <p className="wizard-teal-header__title">Almost there — publish your listing!</p>
                            <span className="wizard-teal-header__counter">Step {stepNumber} of {totalSteps}</span>
                        </div>
                        <p className="wizard-teal-header__subtitle">Review your listing, then add a contact number to go live</p>
                    </div>
                </div>
                <div className="wizard-teal-header__progress">
                    <div className="wizard-teal-header__progress-fill" style={{ width: '100%' }} />
                </div>
            </div>

            <div className="wizard-body">
            <div className="wizard-publish-card">
                <div className="wizard-publish-image">
                    {primaryImageSrc
                        ? <img src={primaryImageSrc} alt="Primary Listing Banner Preview" />
                        : <span>No photos uploaded yet</span>}
                </div>

                <div className="wizard-publish-body">
                    <p className="wizard-kicker">{consolidatedTitle}</p>
                    <h3 className="wizard-price">
                        ₪{data.price ? Number(String(data.price).replace(/,/g, '') || 0).toLocaleString() : '0'}
                        <span>/ month</span>
                    </h3>
                    <p className="wizard-address-line">
                        📍 {data.address?.street || 'Street'} {data.address?.number || ''}, {city}
                    </p>
                    <div className="wizard-spec-row">
                        <span>🛏️ {data.bedrooms || '0'} Rooms</span>
                        <span>🚿 {data.bathrooms || '0'} Baths</span>
                        <span>📐 {data.sizeSqm || '0'} SQM</span>
                        <span>⏳ {data.leaseLength || '0'} Mos</span>
                    </div>
                    {data.description && (
                        <div className="wizard-row">
                            <p className="wizard-kicker">Description</p>
                            <p className="wizard-step-note">{data.description}</p>
                        </div>
                    )}
                    {data.amenities && data.amenities.length > 0 && (
                        <div className="wizard-row">
                            <p className="wizard-kicker">Amenities Added</p>
                            <div className="wizard-amenity-chips">
                                {data.amenities.map((amenity) => (
                                    <span key={amenity} className="wizard-chip">{amenity}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Contact info — always shown, pre-filled if possible ──── */}
            <div className="wizard-publish-contact">
                <div className="wizard-publish-contact-anon">
                    <p className="wizard-publish-contact-label">
                        📱 Contact details for SMS confirmation
                    </p>
                    <div className="wizard-step2-grid" style={{ marginBottom: '12px' }}>
                        <div className="wizard-field">
                            <label className="wizard-field-label">Your first name</label>
                            <input
                                type="text"
                                className="wizard-input"
                                placeholder="First name"
                                value={contactFirstName}
                                onChange={(e) => setContactFirstName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="wizard-field">
                            <label className="wizard-field-label">Phone / WhatsApp</label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <select
                                    style={{ flexShrink: 0, padding: '8px 6px', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '8px', fontSize: '13px', background: 'var(--color-surface, #fff)' }}
                                    value={`${countryCode}|${countryLabel}`}
                                    onChange={(e) => {
                                        const [code, label] = e.target.value.split('|');
                                        setCountryCode(code);
                                        setCountryLabel(label);
                                    }}
                                    aria-label="Country code"
                                >
                                    {COUNTRY_CODES.map((c) => (
                                        <option key={`${c.code}-${c.label}`} value={`${c.code}|${c.label}`}>
                                            {c.flag} {c.code} {c.label}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="tel"
                                    className="wizard-input"
                                    placeholder="050 000 0000"
                                    value={localPhone}
                                    onChange={(e) => setLocalPhone(e.target.value)}
                                    style={{ flex: 1 }}
                                    required
                                />
                            </div>
                            {localPhone.trim() && (
                                <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                                    Full number: <strong>{fullPhone}</strong>
                                </p>
                            )}
                        </div>
                    </div>
                    {!isAuthenticated && (
                        <div className="wizard-publish-signin-nudge">
                            <span>💡 Save time on future listings —</span>
                            <button
                                type="button"
                                className="wizard-publish-signin-link"
                                onClick={() => history.push(`/register?redirect=${encodeURIComponent(window.location.pathname)}`)}
                            >
                                Create a free account
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="wizard-row">
                <label className="wizard-toggle-row">
                    <input type="checkbox" checked={displayPhone}
                        onChange={(e) => setDisplayPhone(e.target.checked)} />
                    <span>Display Phone Number</span>
                </label>
            </div>

            <div className="wizard-actions">
                <button type="button" onClick={prevStep} className="wizard-btn wizard-btn--ghost">
                    Back
                </button>
                <button
                    type="button"
                    onClick={handlePublish}
                    className="wizard-btn wizard-btn--full"
                    disabled={!canPublish}
                    style={{ opacity: canPublish ? 1 : 0.45 }}
                >
                    Go Live! Publish Listing
                </button>
            </div>
            <p className="wizard-footer-note">Your listing will be live in 15 minutes.</p>
            </div>{/* end wizard-body */}
        </div>
    );
};
