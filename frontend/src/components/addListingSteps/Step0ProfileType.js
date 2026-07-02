/**
 * Step0ProfileType.js
 * path: frontend/src/components/addListingSteps/Step0ProfileType.js
 */
import React from 'react';

const RentalOwnerIllustration = () => (
    <svg viewBox="0 0 240 150" style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Rental owners holding a model home">
        <defs>
            <linearGradient id="rental-owner-wall" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f9dcc7" />
                <stop offset="100%" stopColor="#f7efe2" />
            </linearGradient>
            <linearGradient id="rental-owner-table" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#c99660" />
                <stop offset="100%" stopColor="#9a643c" />
            </linearGradient>
            <clipPath id="rental-owner-clip">
                <rect width="240" height="150" rx="14" />
            </clipPath>
        </defs>
        <g clipPath="url(#rental-owner-clip)">
            <rect width="240" height="150" fill="url(#rental-owner-wall)" />
            <circle cx="216" cy="28" r="24" fill="#ffd58f" opacity="0.42" />
            <rect x="172" y="20" width="35" height="45" rx="2" fill="#f7efe2" stroke="#c28b61" strokeWidth="3" />
            <path d="M178 54 C188 35 193 42 201 27" fill="none" stroke="#93b37d" strokeWidth="4" strokeLinecap="round" />
            <rect x="25" y="54" width="11" height="47" rx="4" fill="#79624c" />
            <path d="M31 57 C12 33 23 20 43 42 C42 20 65 16 61 46 C78 34 90 46 72 62" fill="#7da35e" opacity="0.9" />
            <ellipse cx="123" cy="123" rx="101" ry="12" fill="#875738" opacity="0.22" />
            <rect x="10" y="107" width="220" height="43" rx="8" fill="url(#rental-owner-table)" />
            <path d="M22 111 C66 123 170 123 222 112" fill="none" stroke="#e3b37c" strokeWidth="4" opacity="0.5" />
            <path d="M49 68 C38 42 51 24 73 33 C80 20 104 25 104 50 C115 56 102 81 85 77 C74 85 57 80 49 68Z" fill="#8a1f2f" />
            <circle cx="77" cy="58" r="20" fill="#d99070" />
            <path d="M55 62 C57 36 86 28 99 51 C87 47 76 43 61 62Z" fill="#6f1222" />
            <path d="M45 116 C48 88 64 75 80 75 C98 75 112 88 117 116Z" fill="#b77b55" />
            <path d="M64 82 C73 95 86 95 94 82" fill="none" stroke="#f5c7ad" strokeWidth="5" strokeLinecap="round" />
            <path d="M57 61 C53 67 49 73 45 82" fill="none" stroke="#8a1f2f" strokeWidth="11" strokeLinecap="round" />
            <circle cx="69" cy="58" r="2" fill="#3b241f" />
            <circle cx="85" cy="58" r="2" fill="#3b241f" />
            <path d="M68 68 C75 73 84 72 90 66" fill="none" stroke="#7a3b31" strokeWidth="2" strokeLinecap="round" />
            <path d="M139 52 C143 32 169 28 181 45 C188 55 184 73 170 78 C154 83 136 71 139 52Z" fill="#2c1d19" />
            <circle cx="160" cy="59" r="19" fill="#c77d58" />
            <path d="M140 58 C148 40 169 35 180 52 C169 49 158 45 145 61Z" fill="#201412" />
            <path d="M126 116 C129 88 144 75 160 75 C179 75 195 89 200 116Z" fill="#527742" />
            <path d="M144 82 C153 94 167 94 176 82" fill="none" stroke="#efb794" strokeWidth="5" strokeLinecap="round" />
            <circle cx="153" cy="59" r="2" fill="#2a1b19" />
            <circle cx="168" cy="59" r="2" fill="#2a1b19" />
            <path d="M151 69 C158 73 167 72 172 66" fill="none" stroke="#773c31" strokeWidth="2" strokeLinecap="round" />
            <path d="M94 101 L121 78 L149 101Z" fill="#6d4c41" stroke="#4c382e" strokeWidth="3" strokeLinejoin="round" />
            <rect x="101" y="101" width="41" height="29" rx="2" fill="#fff7df" stroke="#7a5941" strokeWidth="2" />
            <rect x="118" y="111" width="11" height="19" rx="1" fill="#8c5c41" />
            <rect x="106" y="107" width="9" height="8" fill="#9ec7d6" stroke="#7a5941" strokeWidth="1.5" />
            <rect x="132" y="107" width="8" height="8" fill="#9ec7d6" stroke="#7a5941" strokeWidth="1.5" />
            <path d="M105 119 C86 113 76 101 68 96" fill="none" stroke="#d99070" strokeWidth="7" strokeLinecap="round" />
            <path d="M138 119 C157 114 168 102 176 96" fill="none" stroke="#c77d58" strokeWidth="7" strokeLinecap="round" />
        </g>
    </svg>
);

const RealtorIllustration = () => (
    <svg viewBox="0 0 240 150" style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Realtor holding a clipboard in front of city buildings">
        <defs>
            <linearGradient id="realtor-sky" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d9edf4" />
                <stop offset="100%" stopColor="#eef8f0" />
            </linearGradient>
            <clipPath id="realtor-clip">
                <rect width="240" height="150" rx="14" />
            </clipPath>
        </defs>
        <g clipPath="url(#realtor-clip)">
            <rect width="240" height="150" fill="url(#realtor-sky)" />
            <path d="M0 116 C38 101 72 115 110 99 C145 84 190 104 240 87 L240 150 L0 150Z" fill="#bad8c4" opacity="0.8" />
            <rect x="18" y="57" width="24" height="75" fill="#9dbbd1" />
            <rect x="48" y="36" width="28" height="97" fill="#b7cad8" />
            <rect x="82" y="70" width="24" height="63" fill="#9eb8cd" />
            <rect x="190" y="52" width="32" height="81" fill="#a6bed1" />
            <path d="M60 36 L73 20 L73 36Z" fill="#8aa8bf" />
            {[25, 56, 198, 210].map((x) => (
                <g key={x}>
                    <rect x={x} y="66" width="5" height="5" fill="#e8f5f9" opacity="0.9" />
                    <rect x={x} y="80" width="5" height="5" fill="#e8f5f9" opacity="0.9" />
                    <rect x={x} y="94" width="5" height="5" fill="#e8f5f9" opacity="0.9" />
                </g>
            ))}
            <circle cx="198" cy="32" r="24" fill="#f7fbff" stroke="#6f8798" strokeWidth="3" />
            <path d="M198 12 L204 32 L198 52 L192 32Z" fill="#1f4e79" />
            <path d="M178 32 L198 26 L218 32 L198 38Z" fill="#d66f5f" />
            <circle cx="198" cy="32" r="4" fill="#34495e" />
            <text x="196" y="9" textAnchor="middle" fontSize="8" fontWeight="700" fill="#425466">N</text>
            <path d="M94 46 C93 23 120 16 137 29 C153 25 168 44 159 64 C156 82 139 87 119 83 C100 84 87 66 94 46Z" fill="#5a2c2d" />
            <circle cx="125" cy="55" r="24" fill="#b96f56" />
            <path d="M101 55 C108 30 138 25 153 49 C137 46 123 37 105 58Z" fill="#3d1f20" />
            <circle cx="116" cy="55" r="2.5" fill="#2d1d1a" />
            <circle cx="135" cy="55" r="2.5" fill="#2d1d1a" />
            <path d="M116 68 C125 74 135 72 142 65" fill="none" stroke="#734033" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M84 150 C88 101 105 79 126 79 C150 79 169 103 174 150Z" fill="#203c5f" />
            <path d="M112 83 L126 112 L141 83" fill="#ffffff" />
            <path d="M118 106 L126 91 L134 106 L128 150 L122 150Z" fill="#d96e67" />
            <path d="M104 96 C95 106 91 123 89 150" fill="none" stroke="#132a45" strokeWidth="5" strokeLinecap="round" />
            <rect x="144" y="88" width="39" height="50" rx="4" fill="#f8f4eb" stroke="#6f8798" strokeWidth="2.5" transform="rotate(8 144 88)" />
            <rect x="151" y="91" width="21" height="8" rx="3" fill="#9eb2c1" transform="rotate(8 151 91)" />
            <path d="M153 109 L176 112 M151 121 L174 124 M150 133 L164 135" stroke="#8fa2af" strokeWidth="2" strokeLinecap="round" />
            <path d="M150 121 C137 115 139 98 146 92" fill="none" stroke="#b96f56" strokeWidth="8" strokeLinecap="round" />
        </g>
    </svg>
);

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
            {/* ── Teal header ── */}
            <div className="wizard-teal-header">
                <div className="wizard-teal-header__inner">
                    <HeaderGlyph />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                            <p className="wizard-teal-header__title">Choose your profile type</p>
                            <span className="wizard-teal-header__counter">{`Step 1 of ${totalSteps}`}</span>
                        </div>
                        <p className="wizard-teal-header__subtitle">Tell us who's listing so we can tailor the next steps</p>
                    </div>
                </div>
                <div className="wizard-teal-header__progress">
                    <div className="wizard-teal-header__progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
            </div>

            {/* ── Body ── */}
            <div className="wizard-body">
                <div className="wizard-section-card">
                    <p className="wizard-section-label">I am a…</p>
                    <div className="wizard-profile-type-grid">
                        {profiles.map((profile) => (
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

                    {showRequired ? (
                        <p className="wizard-profile-type-required">
                            Please select a profile type above to continue.
                        </p>
                    ) : null}
                </div>

                <div className="wizard-actions" style={{ paddingBottom: '4px' }}>
                    <button
                        type="button"
                        onClick={handleContinue}
                        className="wizard-btn wizard-btn--full"
                    >
                        Continue to Profile Details
                    </button>
                </div>
            </div>
        </div>
    );
};
