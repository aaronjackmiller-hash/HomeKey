import React from 'react';

const RentalOwnerIllustration = () => (
    <svg viewBox="0 0 120 100" style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
        {/* Background wash */}
        <rect x="0" y="60" width="120" height="40" rx="4" fill="#f0f4f0" />
        {/* House */}
        <polygon points="60,18 85,40 35,40" fill="#34495E" />
        <rect x="40" y="40" width="40" height="30" fill="#F4F6F7" stroke="#2C3E50" strokeWidth="1" />
        <rect x="54" y="52" width="12" height="18" fill="#5D6D7E" />
        <rect x="44" y="44" width="10" height="9" fill="#AED6F1" stroke="#2C3E50" strokeWidth="0.8" />
        <rect x="66" y="44" width="10" height="9" fill="#AED6F1" stroke="#2C3E50" strokeWidth="0.8" />
        {/* Person left */}
        <circle cx="36" cy="62" r="8" fill="#f5cba7" />
        <path d="M24 85 Q24 70 36 70 Q48 70 48 85 Z" fill="#7fb3d3" />
        <path d="M30 62 Q25 55 32 54 Q36 48 42 54 Q46 56 40 63" fill="#c0392b" />
        {/* Person right */}
        <circle cx="84" cy="62" r="8" fill="#fadbd8" />
        <path d="M72 85 Q72 70 84 70 Q96 70 96 85 Z" fill="#2e7d32" />
        <path d="M78 60 Q76 54 84 52 Q90 52 90 60" fill="#6d4c41" />
        {/* Small house in hands */}
        <polygon points="60,77 68,84 52,84" fill="#34495E" />
        <rect x="55" y="84" width="10" height="8" fill="#F4F6F7" stroke="#2C3E50" strokeWidth="0.8" />
    </svg>
);

const RealtorIllustration = () => (
    <svg viewBox="0 0 120 100" style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
        {/* City skyline background */}
        <rect x="0" y="50" width="120" height="50" fill="#dce8f5" />
        <rect x="5"  y="30" width="20" height="70" fill="#b0c4de" />
        <rect x="10" y="25" width="5"  height="5"  fill="#aed6f1" />
        <rect x="16" y="25" width="5"  height="5"  fill="#aed6f1" />
        <rect x="10" y="33" width="5"  height="5"  fill="#aed6f1" />
        <rect x="16" y="33" width="5"  height="5"  fill="#aed6f1" />
        <rect x="30" y="40" width="16" height="60" fill="#c8d8ea" />
        <rect x="90" y="35" width="25" height="65" fill="#b0c4de" />
        <rect x="93" y="38" width="5"  height="5"  fill="#aed6f1" />
        <rect x="100" y="38" width="5" height="5"  fill="#aed6f1" />
        <rect x="107" y="38" width="5" height="5"  fill="#aed6f1" />
        {/* Person */}
        <circle cx="60" cy="38" r="11" fill="#f5cba7" />
        <path d="M44 95 Q44 65 60 65 Q76 65 76 95 Z" fill="#1a237e" />
        <path d="M52 36 Q50 28 60 26 Q68 26 68 36" fill="#4a235a" />
        {/* Headset */}
        <path d="M49 38 Q49 28 60 28 Q71 28 71 38" fill="none" stroke="#2c3e50" strokeWidth="2" />
        <rect x="47" y="37" width="4" height="5" rx="2" fill="#2c3e50" />
        <rect x="69" y="37" width="4" height="5" rx="2" fill="#2c3e50" />
        {/* Clipboard */}
        <rect x="66" y="58" width="18" height="24" rx="2" fill="#ecf0f1" stroke="#95a5a6" strokeWidth="1" />
        <rect x="69" y="55" width="12" height="5" rx="2" fill="#95a5a6" />
        <line x1="69" y1="66" x2="81" y2="66" stroke="#95a5a6" strokeWidth="1" />
        <line x1="69" y1="70" x2="81" y2="70" stroke="#95a5a6" strokeWidth="1" />
        <line x1="69" y1="74" x2="76" y2="74" stroke="#95a5a6" strokeWidth="1" />
        {/* Arm holding clipboard */}
        <path d="M70 75 Q68 70 70 65" fill="none" stroke="#f5cba7" strokeWidth="3" strokeLinecap="round" />
    </svg>
);

const RenterRoommatesIllustration = () => (
    <svg viewBox="0 0 120 100" style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
        {/* Room background */}
        <rect x="0" y="0" width="120" height="100" fill="#fdf6e3" />
        {/* Lamp */}
        <polygon points="95,15 105,15 103,30 97,30" fill="#f39c12" />
        <rect x="99" y="30" width="2" height="35" fill="#d4a017" />
        <ellipse cx="100" cy="65" rx="8" ry="4" fill="#c8a04a" />
        {/* Picture frame */}
        <rect x="5" y="8" width="22" height="18" rx="2" fill="#e8d5b7" stroke="#c8a04a" strokeWidth="1.5" />
        <rect x="8" y="11" width="16" height="12" fill="#a8d5a2" />
        {/* Sofa */}
        <rect x="10" y="65" width="80" height="20" rx="6" fill="#c5a87a" />
        <rect x="8"  y="60" width="18" height="28" rx="4" fill="#b8956a" />
        <rect x="94" y="60" width="18" height="28" rx="4" fill="#b8956a" />
        <rect x="14" y="55" width="92" height="14" rx="5" fill="#c5a87a" />
        {/* Dog */}
        <ellipse cx="88" cy="85" rx="10" ry="7" fill="#d4a55a" />
        <circle cx="98" cy="80" r="5" fill="#d4a55a" />
        <ellipse cx="101" cy="78" rx="2.5" ry="1.5" fill="#c49048" />
        <circle cx="100" cy="79" r="1" fill="#3d2b1f" />
        <path d="M100 83 Q102 85 104 84" fill="none" stroke="#c49048" strokeWidth="0.8" />
        <path d="M78 89 L75 95" stroke="#d4a55a" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M84 91 L82 96" stroke="#d4a55a" strokeWidth="1.5" strokeLinecap="round" />
        {/* Person on sofa */}
        <circle cx="52" cy="52" r="9" fill="#fadbd8" />
        <path d="M38 80 Q38 65 52 65 Q66 65 66 80 Z" fill="#4caf50" />
        <path d="M45 50 Q44 43 52 41 Q60 41 60 50" fill="#6d4c41" />
        {/* Laptop */}
        <rect x="42" y="67" width="22" height="14" rx="2" fill="#2c3e50" />
        <rect x="43" y="68" width="20" height="12" fill="#85c1e9" />
        <rect x="38" y="80" width="30" height="2" rx="1" fill="#566573" />
        {/* Plant */}
        <rect x="2" y="72" width="4" height="12" fill="#6d4c41" />
        <ellipse cx="4" cy="68" rx="8" ry="7" fill="#27ae60" />
        <ellipse cx="0" cy="72" rx="5" ry="4" fill="#2ecc71" />
        <ellipse cx="8" cy="72" rx="5" ry="4" fill="#2ecc71" />
    </svg>
);

export const Step0ProfileType = ({ profileType, onSelectProfileType, onContinue, totalSteps = 6 }) => {
    const [showRequired, setShowRequired] = React.useState(false);

    const profiles = [
        {
            id: 'rental-owner',
            label: 'Rental Owner',
            description: 'I own the property and want to list it.',
            illustration: <RentalOwnerIllustration />,
        },
        {
            id: 'realtor',
            label: 'Realtor',
            description: 'I am a licensed professional listing properties.',
            illustration: <RealtorIllustration />,
        },
        {
            id: 'renter-roommates',
            label: 'Renter looking for Roommates',
            description: 'I have a great apartment, looking for roommates.',
            illustration: <RenterRoommatesIllustration />,
            wide: true,
        },
    ];

    const handleContinue = () => {
        if (!profileType) {
            setShowRequired(true);
            return;
        }
        onContinue();
    };

    const handleSelect = (id) => {
        onSelectProfileType(id);
        if (showRequired) setShowRequired(false);
    };

    const progressPercent = Math.round((1 / totalSteps) * 100);

    return (
        <div className="wizard-step-card">
            <div className="wizard-progress-rail">
                <div className="wizard-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="wizard-step-header">
                <h2>Step 1: Welcome!<br />Choose your profile type</h2>
                <span className="wizard-step-counter">{`Step 1 of ${totalSteps}`}</span>
            </div>

            <div className="wizard-profile-type-grid">
                {profiles.filter((p) => !p.wide).map((profile) => (
                    <button
                        key={profile.id}
                        type="button"
                        onClick={() => handleSelect(profile.id)}
                        className={`wizard-profile-type-card${profileType === profile.id ? ' is-selected' : ''}`}
                    >
                        <div className="wizard-profile-type-illustration">
                            {profile.illustration}
                        </div>
                        <strong className="wizard-profile-type-label">{profile.label}</strong>
                        <span className="wizard-profile-type-desc">{profile.description}</span>
                    </button>
                ))}
            </div>

            {profiles.filter((p) => p.wide).map((profile) => (
                <button
                    key={profile.id}
                    type="button"
                    onClick={() => handleSelect(profile.id)}
                    className={`wizard-profile-type-card wizard-profile-type-card--wide${profileType === profile.id ? ' is-selected' : ''}`}
                >
                    <div className="wizard-profile-type-illustration wizard-profile-type-illustration--wide">
                        {profile.illustration}
                    </div>
                    <strong className="wizard-profile-type-label">{profile.label}</strong>
                    <span className="wizard-profile-type-desc">{profile.description}</span>
                </button>
            ))}

            {showRequired ? (
                <p className="wizard-profile-type-required">
                    Please select one of the three profile types above to continue.
                </p>
            ) : null}

            <button
                type="button"
                onClick={handleContinue}
                className="wizard-btn wizard-btn--full"
            >
                Continue to Profile Details
            </button>
        </div>
    );
};
