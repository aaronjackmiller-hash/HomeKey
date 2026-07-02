import React, { useEffect, useState } from 'react';

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
    const headerTitle = isEnterpriseTrack ? 'Brand identity assets' : 'Add your media';
    const headerSubtitle = isEnterpriseTrack
        ? 'Upload corporate logo or brand assets to apply a verified identity layer'
        : 'Add photos or videos — the first file becomes the primary image';
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
            {/* ── Teal header ── */}
            <div className="wizard-teal-header">
                <div className="wizard-teal-header__inner">
                    <HeaderGlyph />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                            <p className="wizard-teal-header__title">{headerTitle}</p>
                            <span className="wizard-teal-header__counter">{`Step ${stepNumber} of ${totalSteps}`}</span>
                        </div>
                        <p className="wizard-teal-header__subtitle">{headerSubtitle}</p>
                    </div>
                </div>
                <div className="wizard-teal-header__progress">
                    <div className="wizard-teal-header__progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
            </div>

            {/* ── Body ── */}
            <div className="wizard-body">
                <div className="wizard-section-card">
                    <p className="wizard-section-label">{isEnterpriseTrack ? 'Brand assets' : 'Photos & videos'}</p>
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
                    )}
                </div>

                <div className="wizard-section-card">
                    <p className="wizard-section-label">3D virtual tour</p>
                    <input
                        type="text"
                        placeholder="https://my.matterport.com/show/?m=..."
                        value={data.virtualTourUrl}
                        onChange={(e) => updateData({ virtualTourUrl: e.target.value })}
                        className="wizard-input"
                    />
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
                        onClick={nextStep}
                        className="wizard-btn wizard-btn--full"
                    >
                        {`Continue to Step ${nextStepLabel}`}
                    </button>
                </div>
            </div>
        </div>
    );
};
