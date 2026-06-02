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

const RenterRoommatesIllustration = () => (
    <svg viewBox="0 0 320 150" style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Renter using a laptop on a sofa with a dog nearby">
        <defs>
            <linearGradient id="roommate-wall" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f9e2c7" />
                <stop offset="100%" stopColor="#fff7eb" />
            </linearGradient>
            <clipPath id="roommate-clip">
                <rect width="320" height="150" rx="14" />
            </clipPath>
        </defs>
        <g clipPath="url(#roommate-clip)">
            <rect width="320" height="150" fill="url(#roommate-wall)" />
            <rect x="54" y="16" width="32" height="42" rx="3" fill="#f7f2e8" stroke="#c19067" strokeWidth="3" />
            <path d="M60 49 C69 33 75 42 82 24" fill="none" stroke="#77a06b" strokeWidth="4" strokeLinecap="round" />
            <rect x="222" y="18" width="35" height="45" rx="3" fill="#f7f2e8" stroke="#c19067" strokeWidth="3" />
            <path d="M230 53 C240 35 246 42 252 28" fill="none" stroke="#77a06b" strokeWidth="4" strokeLinecap="round" />
            <path d="M293 32 L310 32 L306 63 L297 63Z" fill="#d99b58" />
            <rect x="301" y="63" width="4" height="59" fill="#8a6a4f" />
            <ellipse cx="303" cy="124" rx="25" ry="7" fill="#8a6a4f" opacity="0.35" />
            <rect x="24" y="118" width="18" height="21" rx="3" fill="#a25e3a" />
            <path d="M33 118 C9 90 28 82 43 103 C44 75 69 80 50 108 C73 98 78 117 49 122" fill="#5e9b57" />
            <ellipse cx="161" cy="130" rx="125" ry="11" fill="#90603f" opacity="0.18" />
            <rect x="59" y="89" width="184" height="44" rx="14" fill="#d7a46d" />
            <rect x="45" y="79" width="48" height="60" rx="13" fill="#c58f5f" />
            <rect x="220" y="79" width="48" height="60" rx="13" fill="#c58f5f" />
            <rect x="73" y="69" width="177" height="39" rx="15" fill="#e5b37a" />
            <path d="M80 91 C113 103 197 103 237 90" fill="none" stroke="#f3cf9d" strokeWidth="5" opacity="0.62" />

            <path d="M135 54 C125 33 140 20 159 29 C172 22 189 35 181 54 C183 67 169 76 154 74 C141 75 130 67 135 54Z" fill="#6a3228" />
            <circle cx="157" cy="56" r="22" fill="#be7557" />
            <path d="M137 57 C143 35 168 31 180 51 C167 47 155 42 140 60Z" fill="#4a241f" />
            <circle cx="150" cy="56" r="2.4" fill="#2f1d19" />
            <circle cx="164" cy="56" r="2.4" fill="#2f1d19" />
            <path d="M149 67 C156 72 164 71 170 65" fill="none" stroke="#774034" strokeWidth="2" strokeLinecap="round" />
            <path d="M122 112 C126 83 140 72 157 72 C177 72 192 87 197 116Z" fill="#5e8b51" />
            <path d="M144 78 C152 89 165 89 173 78" fill="none" stroke="#f0ba98" strokeWidth="5" strokeLinecap="round" />
            <rect x="132" y="96" width="52" height="29" rx="4" fill="#5e6e79" />
            <rect x="137" y="101" width="42" height="21" rx="2" fill="#dbe8ee" />
            <circle cx="158" cy="112" r="3" fill="#9fb2bd" />
            <rect x="123" y="124" width="70" height="5" rx="2" fill="#33434e" />
            <path d="M138 103 C126 99 120 87 125 82" fill="none" stroke="#be7557" strokeWidth="7" strokeLinecap="round" />
            <path d="M177 103 C190 99 194 87 189 82" fill="none" stroke="#be7557" strokeWidth="7" strokeLinecap="round" />

            <ellipse cx="237" cy="127" rx="22" ry="13" fill="#d59b4f" />
            <circle cx="260" cy="119" r="12" fill="#d59b4f" />
            <ellipse cx="266" cy="114" rx="7" ry="5" fill="#a86e39" transform="rotate(-22 266 114)" />
            <circle cx="263" cy="118" r="2" fill="#2c2018" />
            <path d="M259 126 C264 132 271 129 273 124" fill="none" stroke="#8c5a2e" strokeWidth="2" strokeLinecap="round" />
            <path d="M219 133 L211 144 M232 136 L226 147 M251 134 L257 146" stroke="#b5793c" strokeWidth="4" strokeLinecap="round" />
            <path d="M216 120 C199 111 198 101 211 101" fill="none" stroke="#d59b4f" strokeWidth="5" strokeLinecap="round" />
        </g>
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
