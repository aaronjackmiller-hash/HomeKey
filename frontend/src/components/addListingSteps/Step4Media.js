import React, { useEffect, useState } from 'react';

export const Step4Media = ({
    data,
    updateData,
    nextStep,
    prevStep,
    stepNumber = 4,
    totalSteps = 5,
    progressPercent = 80,
    isEnterpriseTrack = false,
}) => {
    const nextStepLabel = Math.min(stepNumber + 1, totalSteps);
    const [previews, setPreviews] = useState([]);
    const headingText = isEnterpriseTrack
        ? `Step ${stepNumber}: Brand identity assets`
        : `Step ${stepNumber}: Add your media`;
    const noteText = isEnterpriseTrack
        ? 'Upload corporate logo or brand assets to apply a verified identity layer to enterprise listings.'
        : 'Add photos or videos. The first file becomes the primary image.';
    const uploadTitle = isEnterpriseTrack ? 'Upload Corporate Branding Assets' : 'Add Photos and Videos';
    const uploadCopy = isEnterpriseTrack
        ? 'Click to upload logo files... (SVG, PNG, JPEG)'
        : 'Click to upload, or drag files here... (GIF, PNG, JPEG)';

    useEffect(() => {
        const mediaPreviews = (data.mediaFiles || []).map((file) => URL.createObjectURL(file));
        setPreviews(mediaPreviews);

        return () => {
            mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [data.mediaFiles]);

    const handleFileChange = (e) => {
        if (!e.target.files) {
            return;
        }
        const filesArray = Array.from(e.target.files);
        updateData({ mediaFiles: [...(data.mediaFiles || []), ...filesArray] });
        e.target.value = '';
    };

    return (
        <div className="wizard-step-card">
            <div className="wizard-progress-rail">
                <div className="wizard-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="wizard-step-header">
                <h2>{headingText}</h2>
                <span className="wizard-step-counter">{`Step ${stepNumber} of ${totalSteps}`}</span>
            </div>

            <p className="wizard-step-note">
                {noteText}
            </p>

            <div className="wizard-upload-box">
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="wizard-upload-input"
                />
                <p className="wizard-upload-title">{uploadTitle}</p>
                <p className="wizard-upload-copy">{uploadCopy}</p>
            </div>

            {previews.length > 0 && (
                <div className="wizard-row">
                    <label className="wizard-label">Uploaded Images Gallery</label>
                    <div className="wizard-preview-grid">
                        {previews.map((src, idx) => (
                            <div key={src} className="wizard-preview-cell">
                                <img src={src} alt="Preview" />
                                {idx === 0 && (
                                    <span className="wizard-primary-badge">
                                        Primary
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="wizard-row">
                <label className="wizard-label">3D Virtual Tour URL</label>
                <input
                    type="text"
                    placeholder="https://my.matterport.com/show/?m=..."
                    value={data.virtualTourUrl}
                    onChange={(e) => updateData({ virtualTourUrl: e.target.value })}
                    className="wizard-input"
                />
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
                    onClick={nextStep}
                    className="wizard-btn wizard-btn--full"
                >
                    {`Continue to Step ${nextStepLabel}`}
                </button>
            </div>
        </div>
    );
};
