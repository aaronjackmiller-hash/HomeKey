import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { getRoommateListing } from '../services/api';
import { isFavoriteProperty, toggleFavoriteProperty } from '../utils/propertyInterest';
import { getPropertyId } from '../utils/propertyIdentity';
import { getLocalizedAddress } from '../utils/addressLocalization';
import { logRoommateDemandSignal } from '../utils/logRoommateDemand';
import { useLanguage } from '../context/LanguageContext';
import { ROOMMATE_AMENITY_LABELS, normalizeRoommateAmenityList } from '../constants/roommateAmenities';
import HomeKeyLogoBadge from './HomeKeyLogoBadge';

const safeText = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizePhoneForLinks = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const cleaned = raw.replace(/[^\d+]/g, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('+')) return cleaned.slice(1);
    if (cleaned.startsWith('0')) return `972${cleaned.slice(1)}`;
    return cleaned;
};

const buildWhatsAppHref = (phone, title = 'this room') => {
    const normalizedPhone = normalizePhoneForLinks(phone);
    if (!normalizedPhone) return '';
    const message = `Hi! I saw your room listing for ${title} on HomeKey and I'm interested.`;
    return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};

const buildPhoneHref = (phone) => {
    const normalizedPhone = normalizePhoneForLinks(phone);
    return normalizedPhone ? `tel:+${normalizedPhone}` : '';
};

const buildEmailHref = (email, title = 'this room') => {
    const trimmedEmail = safeText(email);
    if (!trimmedEmail) return '';
    const subject = encodeURIComponent(`Interested in ${title}`);
    const body = encodeURIComponent(`Hi! I saw your room listing for ${title} on HomeKey and I'm interested.`);
    return `mailto:${trimmedEmail}?subject=${subject}&body=${body}`;
};

const formatPrice = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? `₪ ${n.toLocaleString()}` : '—';
};

const GENDER_LABELS = {
    'no-preference': 'No preference',
    men: 'Men only',
    women: 'Women only',
};

const SMOKING_LABELS = {
    'not-allowed': 'Not allowed',
    'outside-only': 'Outside only',
    allowed: 'Allowed',
};

const PETS_LABELS = {
    'not-allowed': 'Not allowed',
    allowed: 'Allowed',
    'have-pets': 'Lister has pets',
};

const KOSHER_LABELS = {
    no: 'No',
    yes: 'Yes',
    'open-to-it': 'Open to it',
};

const AMENITY_LABELS = ROOMMATE_AMENITY_LABELS;

const daysUntil = (isoDate) => {
    if (!isoDate) return null;
    const target = new Date(isoDate).getTime();
    if (Number.isNaN(target)) return null;
    const diffMs = target - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

const daysSince = (isoDate) => {
    if (!isoDate) return null;
    const created = new Date(isoDate).getTime();
    if (Number.isNaN(created)) return null;
    const diffMs = Date.now() - created;
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

const RoommateListingDetail = () => {
    const { id } = useParams();
    const history = useHistory();
    const { language } = useLanguage();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const [heroImageIndex, setHeroImageIndex] = useState(0);
    const [, setInterestVersion] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const fetchListing = async () => {
            setLoading(true);
            setError('');
            try {
                const result = await getRoommateListing(id);
                if (!cancelled) setListing(result?.data || null);
            } catch (err) {
                if (cancelled) return;
                if (err?.response?.status === 404) {
                    setError('This room listing was not found. It may have been removed or filled.');
                } else {
                    setError(err?.response?.data?.message || 'Failed to load this listing. Please try again.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchListing();
        return () => { cancelled = true; };
    }, [id]);

    // Log a demand signal once the listing has loaded, since the searcher
    // has now genuinely viewed this specific apartment's details.
    useEffect(() => {
        if (listing) logRoommateDemandSignal(listing);
    }, [listing]);

    // Escape closes the lightbox; arrow keys browse it — lets people back
    // out or move between photos without hunting for an on-screen button.
    // This MUST stay above the early returns below — hooks have to run in
    // the same order on every render, and placing this after a conditional
    // `return` made it skip entirely on the first (loading) render but run
    // on later ones, which is exactly what crashed the page with React
    // error #310. Self-contained (reads `listing` directly) so it doesn't
    // depend on anything computed further down, after those returns.
    useEffect(() => {
        if (selectedImageIndex == null) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setSelectedImageIndex(null);
                return;
            }
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            const images = (Array.isArray(listing?.images) ? listing.images : []).filter(Boolean);
            if (images.length <= 1) return;
            const delta = e.key === 'ArrowLeft' ? -1 : 1;
            setSelectedImageIndex((prev) => (prev == null ? prev : (prev + delta + images.length) % images.length));
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedImageIndex, listing]);

    if (loading) return <p className="status-message">Loading room details…</p>;
    if (error) return <p className="status-message status-message-error">{error}</p>;
    if (!listing) return null;

    const propertyId = getPropertyId(listing) || id;
    const localizedAddress = getLocalizedAddress(listing.address, language);
    const street = safeText(localizedAddress.street);
    const streetNumber = safeText(localizedAddress.streetNumber);
    const neighborhood = safeText(localizedAddress.neighborhood);
    const city = safeText(localizedAddress.city);
    const locationLine = [
        [street, streetNumber].filter(Boolean).join(' '),
        neighborhood,
        city,
    ].filter(Boolean).join(', ');
    // Title shows street + neighborhood only — city is already shown on its
    // own line directly below, so including it here too just repeats it.
    const titleLine = [
        [street, streetNumber].filter(Boolean).join(' '),
        neighborhood,
    ].filter(Boolean).join(', ');

    const allImages = (Array.isArray(listing.images) ? listing.images : []).filter(Boolean);
    const hasImages = allImages.length > 0;

    const favoriteActive = isFavoriteProperty(propertyId);
    const handleToggleFavorite = () => {
        if (!propertyId) return;
        toggleFavoriteProperty(listing);
        setInterestVersion((value) => value + 1);
    };

    const contact = listing.contact || {};
    const phone = safeText(contact.phone);
    const email = safeText(contact.email);
    const preferredMethod = safeText(contact.preferredMethod) || 'phone';

    const whatsappHref = buildWhatsAppHref(phone, locationLine);
    const phoneHref = buildPhoneHref(phone);
    const emailHref = buildEmailHref(email, locationLine);

    const lifestyle = listing.lifestyle || {};
    // Itemized breakdown (new listings). Falls back to the single combined
    // utilitiesEstimate for listings created before this field existed —
    // and shows nothing at all if there are genuinely no additional fees.
    const utilities = listing.utilities || {};
    const itemizedUtilities = [
        { label: 'Electricity', amount: Number(utilities.electricity) || 0 },
        { label: 'Water', amount: Number(utilities.water) || 0 },
        { label: 'Internet', amount: Number(utilities.internet) || 0 },
        { label: 'VAAD', amount: Number(utilities.vaad) || 0 },
    ].filter((item) => item.amount > 0);
    const hasItemizedUtilities = itemizedUtilities.length > 0;
    const itemizedUtilitiesEstimate = itemizedUtilities.reduce((sum, item) => sum + item.amount, 0);
    const legacyUtilitiesEstimate = Number(listing.utilitiesEstimate) || 0;
    const genderLabel = GENDER_LABELS[listing.genderPreference] || GENDER_LABELS['no-preference'];
    const smokingLabel = SMOKING_LABELS[lifestyle.smoking] || SMOKING_LABELS['not-allowed'];
    const petsLabel = PETS_LABELS[lifestyle.pets] || PETS_LABELS['not-allowed'];
    const kosherLabel = KOSHER_LABELS[lifestyle.kosherKitchen] || KOSHER_LABELS.no;
    const vibe = safeText(lifestyle.vibe);
    const description = safeText(listing.description);
    const totalBedrooms = listing.totalBedrooms ?? listing.bedrooms ?? listing.rooms ?? null;
    const totalBathrooms = listing.totalBathrooms ?? listing.bathrooms ?? null;
    const sizeSqm = listing.sizeSqm ?? listing.size ?? null;

    const listedDaysAgo = daysSince(listing.createdAt);
    const expiresInDays = daysUntil(listing.expiresAt);

    const openImageViewer = (index) => {
        if (!hasImages) return;
        const bounded = Math.max(0, Math.min(index, allImages.length - 1));
        setSelectedImageIndex(bounded);
    };
    const closeImageViewer = () => setSelectedImageIndex(null);
    const showPrevImage = () => {
        if (selectedImageIndex == null || allImages.length <= 1) return;
        setSelectedImageIndex((selectedImageIndex - 1 + allImages.length) % allImages.length);
    };
    const showNextImage = () => {
        if (selectedImageIndex == null || allImages.length <= 1) return;
        setSelectedImageIndex((selectedImageIndex + 1) % allImages.length);
    };

    // Lets the lister click directly through photos on the hero image itself,
    // without opening the full lightbox — separate state from the lightbox's
    // own selectedImageIndex since the two serve different views.
    const showPrevHeroImage = (e) => {
        e.stopPropagation();
        if (allImages.length <= 1) return;
        setHeroImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    };
    const showNextHeroImage = (e) => {
        e.stopPropagation();
        if (allImages.length <= 1) return;
        setHeroImageIndex((prev) => (prev + 1) % allImages.length);
    };

    const handleContactClick = (href) => {
        if (!href || typeof window === 'undefined') return;
        logRoommateDemandSignal(listing);
        window.open(href, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="property-detail-page">
            <div className="detail-shell">
                <button className="ghost-button" onClick={() => history.push('/?type=roommates')}>
                    ← Back to rooms
                </button>

                <section className="detail-hero-card">
                    <div className="detail-hero-image-wrap">
                        {hasImages ? (
                            <>
                                <img
                                    className="detail-hero-image"
                                    src={allImages[heroImageIndex]}
                                    alt={locationLine || 'Room listing'}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => openImageViewer(heroImageIndex)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            openImageViewer(heroImageIndex);
                                        }
                                    }}
                                />
                                {allImages.length > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            className="detail-hero-nav prev"
                                            onClick={showPrevHeroImage}
                                            aria-label="Previous photo"
                                        >
                                            ‹
                                        </button>
                                        <button
                                            type="button"
                                            className="detail-hero-nav next"
                                            onClick={showNextHeroImage}
                                            aria-label="Next photo"
                                        >
                                            ›
                                        </button>
                                        <span className="detail-hero-image-counter">
                                            {heroImageIndex + 1} / {allImages.length}
                                        </span>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="detail-hero-image detail-hero-image--empty" aria-hidden="true">
                                <span>🏠</span>
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        className={`detail-favorite-fab ${favoriteActive ? 'is-active' : ''}`}
                        onClick={handleToggleFavorite}
                        aria-pressed={favoriteActive}
                        aria-label={favoriteActive ? 'Remove listing from liked properties' : 'Add listing to liked properties'}
                    >
                        <span className="property-heart-icon-wrap" aria-hidden="true">
                            <svg className="property-heart-icon" viewBox="0 0 24 24" focusable="false">
                                <path d="M12 21s-6.6-4.5-9.1-8.2C.8 9.5 1.5 5.8 4.5 4c2.2-1.3 5-.7 6.7 1.2L12 6l.8-.8c1.8-1.9 4.5-2.4 6.7-1.2 3 1.8 3.7 5.5 1.6 8.8C18.6 16.5 12 21 12 21Z" />
                            </svg>
                        </span>
                    </button>
                    <div className="detail-hero-content detail-template-panel">
                        <div className="detail-template-head">
                            <span className="detail-template-type">Roommates</span>
                            <h1 className="detail-template-title" dir="auto">
                                {titleLine || 'Room listing'}
                            </h1>
                            <p className="detail-template-location">{city ? city.toUpperCase() : 'ISRAEL'}</p>
                        </div>
                        <div className="detail-template-metrics">
                            <div className="detail-template-metric">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                    <path d="M3 12.5V8.8a1.8 1.8 0 0 1 1.8-1.8h14.4A1.8 1.8 0 0 1 21 8.8v3.7" />
                                    <path d="M3 12.5h18V17H3z" />
                                    <path d="M6 9.5h4.8V12H6z" />
                                    <path d="M13.2 9.5H18V12h-4.8z" />
                                    <path d="M4 17v2M20 17v2" />
                                </svg>
                                <span>{totalBedrooms ?? '—'} BED</span>
                            </div>
                            <div className="detail-template-metric">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                    <path d="M5 12h14v4.4A3.6 3.6 0 0 1 15.4 20H8.6A3.6 3.6 0 0 1 5 16.4V12Z" />
                                    <path d="M8 12V8.8A2.8 2.8 0 0 1 10.8 6h1.5a1.7 1.7 0 1 1 0 3.4h-1" />
                                    <path d="M7 20v1.5M17 20v1.5" />
                                    <path d="M16.8 9.2l1.7 1.7M18.5 9.2l-1.7 1.7" />
                                </svg>
                                <span>{totalBathrooms ?? '—'} BATH</span>
                            </div>
                            <div className="detail-template-metric">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                    <path d="M4 4h7v3h3V4h6v16h-6v-4h-4v4H4z" />
                                    <path d="M11 4v5h3" />
                                    <path d="M10 16v-3h4" />
                                    <path d="M6.2 9.4h2M6.2 12h2" />
                                </svg>
                                <span>{sizeSqm ? `${sizeSqm} SQM` : '— SQM'}</span>
                            </div>
                        </div>
                        <div className="detail-template-price detail-template-price--roommate">
                            <div className="detail-template-price-mark detail-template-price-mark--roommate">
                                <HomeKeyLogoBadge compact className="detail-template-price-logo detail-template-price-logo--roommate" />
                            </div>
                            <div className="detail-template-price-copy">
                                <p>MONTHLY RENT SHARE</p>
                                <strong>
                                    <span className="detail-template-price-currency">₪</span>
                                    {Number(listing.rentShare || 0).toLocaleString()}
                                </strong>
                                {hasItemizedUtilities ? (
                                    <div className="detail-template-utilities">
                                        <p className="detail-template-utilities-label">
                                            + {formatPrice(itemizedUtilitiesEstimate)} Estimated Additional Monthly Expenses
                                        </p>
                                    </div>
                                ) : legacyUtilitiesEstimate > 0 && (
                                    <p className="detail-template-utilities-legacy">
                                        + {formatPrice(legacyUtilitiesEstimate)} Estimated Additional Monthly Expenses
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="detail-hero-scroll-cue"
                        onClick={() => window.scrollTo({ top: window.scrollY + 260, behavior: 'smooth' })}
                        aria-label="Scroll down for apartment details"
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    </button>
                </section>

                {allImages.length > 1 && (
                    <section className="detail-gallery-grid">
                        {allImages.slice(1).map((image, index) => {
                            const actualIndex = index + 1;
                            const isActiveInHero = heroImageIndex === actualIndex;
                            return (
                                <button
                                    key={index}
                                    type="button"
                                    className={`detail-gallery-image-button detail-gallery-image-button--framed ${isActiveInHero ? 'is-active' : ''}`}
                                    onClick={() => setHeroImageIndex(actualIndex)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setHeroImageIndex(actualIndex);
                                        }
                                    }}
                                    aria-label={`Show photo ${actualIndex + 1} in the main view`}
                                    aria-pressed={isActiveInHero}
                                >
                                    <span className="detail-gallery-image-media">
                                        <img src={image} alt={`Room photo ${actualIndex + 1}`} />
                                    </span>
                                </button>
                            );
                        })}
                    </section>
                )}

                {description && (
                    <section className="detail-section-card">
                        <h2>About the apartment</h2>
                        <p className="detail-description">{description}</p>
                    </section>
                )}

                {Array.isArray(listing.amenities) && listing.amenities.length > 0 && (
                    <section className="detail-section-card">
                        <h2>Amenities</h2>
                        <div className="roommate-detail-amenity-grid">
                            {normalizeRoommateAmenityList(listing.amenities).map((value) => {
                                const info = AMENITY_LABELS[value];
                                return (
                                    <div key={value} className="roommate-detail-amenity-row">
                                        <span className="roommate-detail-pref-icon" aria-hidden="true">{info?.icon || '✓'}</span>
                                        <span className="roommate-detail-pref-text">{info?.label || value}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                <section className="detail-section-card">
                    <h2>Looking for a roommate who...</h2>
                    <div className="roommate-detail-pref-grid">
                        <div className="roommate-detail-pref-row">
                            <span className="roommate-detail-pref-icon" aria-hidden="true">👥</span>
                            <span className="roommate-detail-pref-text">{genderLabel}</span>
                        </div>
                        <div className="roommate-detail-pref-row">
                            <span className="roommate-detail-pref-icon" aria-hidden="true">🚬</span>
                            <span className="roommate-detail-pref-text">Smoking: {smokingLabel}</span>
                        </div>
                        <div className="roommate-detail-pref-row">
                            <span className="roommate-detail-pref-icon" aria-hidden="true">🐾</span>
                            <span className="roommate-detail-pref-text">Pets: {petsLabel}</span>
                        </div>
                        <div className="roommate-detail-pref-row">
                            <span className="roommate-detail-pref-icon" aria-hidden="true">✡️</span>
                            <span className="roommate-detail-pref-text">Kosher kitchen: {kosherLabel}</span>
                        </div>
                    </div>
                    {vibe && <p className="roommate-detail-vibe">💬 "{vibe}"</p>}
                </section>

                <section className="detail-section-card roommate-detail-contact-card">
                    <h2>Interested? Get in touch</h2>
                    <div className="roommate-detail-contact-buttons">
                        {whatsappHref && (
                            <button
                                type="button"
                                className={`roommate-detail-contact-btn roommate-detail-contact-btn--whatsapp ${preferredMethod === 'whatsapp' ? 'is-preferred' : ''}`}
                                onClick={() => handleContactClick(whatsappHref)}
                            >
                                WhatsApp
                            </button>
                        )}
                        {phoneHref && (
                            <button
                                type="button"
                                className={`roommate-detail-contact-btn ${preferredMethod === 'phone' ? 'is-preferred' : ''}`}
                                onClick={() => handleContactClick(phoneHref)}
                            >
                                Call
                            </button>
                        )}
                        {emailHref && (
                            <button
                                type="button"
                                className={`roommate-detail-contact-btn ${preferredMethod === 'email' ? 'is-preferred' : ''}`}
                                onClick={() => handleContactClick(emailHref)}
                            >
                                Email
                            </button>
                        )}
                    </div>
                    <p className="roommate-detail-listed-note">
                        {listedDaysAgo != null && `Listed ${listedDaysAgo === 0 ? 'today' : `${listedDaysAgo} day${listedDaysAgo === 1 ? '' : 's'} ago`}`}
                        {listedDaysAgo != null && expiresInDays != null && ' · '}
                        {expiresInDays != null && `expires in ${expiresInDays} day${expiresInDays === 1 ? '' : 's'}`}
                    </p>
                </section>
            </div>

            {selectedImageIndex != null && allImages[selectedImageIndex] && (
                <div className="image-lightbox-backdrop" onClick={closeImageViewer}>
                    <div className="image-lightbox-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="image-lightbox-toolbar">
                            <span>{selectedImageIndex + 1} / {allImages.length}</span>
                            <button className="image-lightbox-close" onClick={closeImageViewer} type="button">Close</button>
                        </div>
                        <div className="image-lightbox-stage">
                            <div className="image-lightbox-image-wrap">
                                <span className="image-lightbox-image-media">
                                    <img
                                        className="lightbox-rendered-image"
                                        src={allImages[selectedImageIndex]}
                                        alt={`Room photo ${selectedImageIndex + 1}`}
                                    />
                                </span>
                            </div>
                            {allImages.length > 1 && (
                                <>
                                    <button
                                        className="image-lightbox-nav prev"
                                        onClick={(e) => { e.stopPropagation(); showPrevImage(); }}
                                        type="button"
                                    >
                                        ‹
                                    </button>
                                    <button
                                        className="image-lightbox-nav next"
                                        onClick={(e) => { e.stopPropagation(); showNextImage(); }}
                                        type="button"
                                    >
                                        ›
                                    </button>
                                </>
                            )}
                        </div>
                        {allImages.length > 1 && (
                            <div className="image-lightbox-filmstrip">
                                {allImages.map((image, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className={`image-lightbox-filmstrip-thumb ${index === selectedImageIndex ? 'is-active' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(index); }}
                                        aria-label={`Go to photo ${index + 1}`}
                                    >
                                        <img src={image} alt="" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoommateListingDetail;
