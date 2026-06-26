/**
 * Step5PublishListing.js
 * path: frontend/src/components/addListingSteps/Step5PublishListing.js
 *
 * If logged in: contact info pre-filled from account, one-click publish.
 * If not logged in: inline name + phone fields with sign-in nudge.
 * Phone pre-filled from localStorage if previously entered.
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

const saveStoredContact = ({ firstName, phone }) => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return;
        const existing = getStoredContact();
        window.localStorage.setItem(CONTACT_CACHE_KEY, JSON.stringify({ ...existing, firstName, phone }));
    } catch (_err) {}
};

export const Step5PublishListing = ({
    data,
    prevStep,
    onPublishFinished,
    stepNumber = 5,
    totalSteps = 5,
}) => {
    const { isAuthenticated, user } = useAuth();
    const history = useHistory();
    const [primaryImageSrc, setPrimaryImageSrc] = useState('');
    const [displayPhone, setDisplayPhone] = useState(true);

    // Contact fields for logged-out users
    const stored = getStoredContact();
    const [contactFirstName, setContactFirstName] = useState(
        user?.name?.split(' ')[0] || stored.firstName || ''
    );
    const [contactPhone, setContactPhone] = useState(
        user?.phone || user?.whatsapp || stored.phone || ''
    );

    useEffect(() => {
        if (data.mediaFiles && data.mediaFiles.length > 0) {
            const objectUrl = URL.createObjectURL(data.mediaFiles[0]);
            setPrimaryImageSrc(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
        setPrimaryImageSrc('');
        return undefined;
    }, [data.mediaFiles]);

    // Keep fields in sync when auth state changes
    useEffect(() => {
        if (isAuthenticated && user) {
            setContactFirstName(user.name?.split(' ')[0] || '');
            setContactPhone(user.phone || user.whatsapp || '');
        }
    }, [isAuthenticated, user]);

    const transactionType = data.listingType === 'For Sale' ? 'Sale' : 'Rent';
    const propertyType = data.propertyType || 'Apartment';
    const city = data.address.city || 'Tel Aviv';
    const consolidatedTitle = `${propertyType} for ${transactionType} — ${city}`;

    const canPublish = Boolean(contactFirstName.trim() && contactPhone.trim());

    const handlePublish = () => {
        if (!isAuthenticated) {
            saveStoredContact({ firstName: contactFirstName, phone: contactPhone });
        }
        onPublishFinished({
            anonPhone: isAuthenticated ? (user?.phone || user?.whatsapp || '') : contactPhone,
            anonFirstName: isAuthenticated ? (user?.name?.split(' ')[0] || '') : contactFirstName,
        });
    };

    return (
        <div className="wizard-step-card">
            <div className="wizard-progress-rail">
                <div className="wizard-progress-fill" style={{ width: '100%' }} />
            </div>
            <div className="wizard-step-header">
                <h2>{`Step ${stepNumber}: Publish listing!`}</h2>
                <span className="wizard-step-counter">{`Step ${stepNumber} of ${totalSteps}`}</span>
            </div>

            <div className="wizard-publish-card">
                <div className="wizard-publish-image">
                    {primaryImageSrc ? (
                        <img src={primaryImageSrc} alt="Primary Listing Banner Preview" />
                    ) : (
                        <span>No photos uploaded yet</span>
                    )}
                </div>

                <div className="wizard-publish-body">
                    <p className="wizard-kicker">{consolidatedTitle}</p>

                    <h3 className="wizard-price">
                        ₪{data.price ? Number(String(data.price).replace(/,/g, '') || 0).toLocaleString() : '0'} <span>/ month</span>
                    </h3>

                    <p className="wizard-address-line">
                        📍 {data.address.street || 'Street'} {data.address.number || ''}, {city}
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

    {/* ── Contact info section ───────────────────────────────────── */}
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
                            <input
                                type="tel"
                                className="wizard-input"
                                placeholder="05X XXX XXXX"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                required
                            />
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
                    <input
                        type="checkbox"
                        checked={displayPhone}
                        onChange={(e) => setDisplayPhone(e.target.checked)}
                    />
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
        </div>
    );
};
