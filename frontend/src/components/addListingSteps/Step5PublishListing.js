import React, { useEffect, useState } from 'react';

export const Step5PublishListing = ({ data, prevStep, onPublishFinished }) => {
    const [primaryImageSrc, setPrimaryImageSrc] = useState('');
    const [displayPhone, setDisplayPhone] = useState(true);

    useEffect(() => {
        if (data.mediaFiles && data.mediaFiles.length > 0) {
            const objectUrl = URL.createObjectURL(data.mediaFiles[0]);
            setPrimaryImageSrc(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
        setPrimaryImageSrc('');
        return undefined;
    }, [data.mediaFiles]);

    return (
        <div className="wizard-step-card">
            <div className="wizard-progress-rail">
                <div className="wizard-progress-fill" style={{ width: '100%' }} />
            </div>
            <div className="wizard-step-header">
                <h2>Step 5: Publish listing!</h2>
                <span className="wizard-step-counter">Step 5 of 5</span>
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
                    <p className="wizard-kicker">
                        {data.listingType || 'Rental'} Listing in {data.address.city || 'Tel Aviv-Yafo'}
                    </p>
                    <div className="wizard-kicker">
                        {data.propertyType || 'Apartment'} in {data.address.city || 'Tel Aviv-Yafo'}
                    </div>

                    <h3 className="wizard-price">
                        ₪{data.price ? Number(String(data.price).replace(/,/g, '') || 0).toLocaleString() : '0'} <span>/ month</span>
                    </h3>

                    <p className="wizard-address-line">
                        📍 {data.address.street || 'Street'} {data.address.number || ''}, {data.address.city || 'City'}
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
                                    <span key={amenity} className="wizard-chip">
                                        {amenity}
                                    </span>
                                ))}
                            </div>
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
                <button
                    type="button"
                    onClick={prevStep}
                    className="wizard-btn wizard-btn--ghost"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={onPublishFinished}
                    className="wizard-btn wizard-btn--full"
                >
                    Go Live! Publish Listing
                </button>
            </div>
            <p className="wizard-footer-note">
                Your listing will be live in 15 minutes.
            </p>
        </div>
    );
};
