import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
    getProperty,
    deleteProperty,
    createPropertyInquiry,
    registerShowingAttendee,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const formatCurrency = (value) => {
    if (value == null || Number.isNaN(Number(value))) return '—';
    return `₪${Number(value).toLocaleString()}`;
};

const formatDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
};

const safeText = (value) => (typeof value === 'string' ? value.trim() : '');

const ENGLISH_LISTING_WORD_RE = /\b(the|and|with|for|in|to|from|apartment|property|rent|rental|sale|bed|bath|room|building|near|available|price|spacious|located)\b/i;

const hasHebrew = (value) => /[א-ת]/.test(String(value || ''));

const isYad2LikeListing = (property = {}) =>
    /yad2/i.test(String(property.externalSource || ''))
    || ['yad2-sync', 'yad2-scrape'].includes(String(property.sourceType || ''));

const isReadableImportedText = (property = {}, value) => {
    const text = safeText(value);
    if (!text) return false;
    if (hasHebrew(text)) return true;
    if (!isYad2LikeListing(property)) return true;
    return ENGLISH_LISTING_WORD_RE.test(text);
};

const dedupeCaseInsensitive = (values = []) => {
    const seen = new Set();
    return values.filter((value) => {
        const normalized = safeText(value);
        if (!normalized) return false;
        const key = normalized.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const dedupeRepeatingPhrase = (value) => {
    const text = safeText(value);
    if (!text) return '';
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 2) return text;
    const maxPhraseLen = Math.min(6, Math.floor(words.length / 2));
    for (let phraseLen = maxPhraseLen; phraseLen >= 1; phraseLen -= 1) {
        const phrase = words.slice(0, phraseLen).join(' ');
        const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const repeated = words
            .join(' ')
            .replace(new RegExp(`^(?:${escaped}\\s+){2,}`, 'i'), `${phrase} `)
            .trim();
        if (repeated.length < text.length) return repeated;
    }
    return text;
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const splitStreetAndNumber = (streetValue = '', explicitStreetNumber = '') => {
    let street = safeText(streetValue);
    let streetNumber = safeText(explicitStreetNumber);

    if (!streetNumber) {
        const leadingNumber = street.match(/^(\d+[a-zA-Zא-ת0-9\-\/]*)\s+(.+)$/);
        if (leadingNumber) {
            streetNumber = safeText(leadingNumber[1]);
            street = safeText(leadingNumber[2]);
        }
    }

    if (!streetNumber) {
        const trailingNumber = street.match(/^(.+?)\s+(\d+[a-zA-Zא-ת0-9\-\/]*)$/);
        if (trailingNumber) {
            street = safeText(trailingNumber[1]);
            streetNumber = safeText(trailingNumber[2]);
        }
    }

    if (street && streetNumber) {
        const escapedNumber = escapeRegex(streetNumber);
        street = street
            .replace(new RegExp(`^${escapedNumber}\\s+`, 'i'), '')
            .replace(new RegExp(`\\s+${escapedNumber}$`, 'i'), '')
            .trim();
    }

    return { street, streetNumber };
};

const normalizeStreetDisplay = (streetValue = '', explicitStreetNumber = '') => {
    const { street, streetNumber } = splitStreetAndNumber(streetValue, explicitStreetNumber);
    return [street, streetNumber].filter(Boolean).join(' ').trim();
};

const getAddressLine = (address) => {
    const street = normalizeStreetDisplay(address?.street, address?.streetNumber);
    const city = safeText(address?.city);
    const state = safeText(address?.state);
    const zip = safeText(address?.zip);
    const nonIsraelCountry = safeText(address?.country).toLowerCase() === 'israel' ? '' : safeText(address?.country);
    const parts = dedupeCaseInsensitive([street, city, state, zip, nonIsraelCountry]);
    return parts.join(', ');
};

const getPrimaryAddressTitle = (property = {}) => {
    const street = normalizeStreetDisplay(property.address?.street, property.address?.streetNumber);
    if (street) return street;
    const title = String(property.title || '').trim();
    if (isReadableImportedText(property, title)) return title;
    const city = safeText(property.address?.city);
    return city ? `Property in ${city}` : 'Property listing';
};

const getPrimaryStreetParts = (property = {}) => {
    const fromAddress = splitStreetAndNumber(property.address?.street, property.address?.streetNumber);
    if (fromAddress.street || fromAddress.streetNumber) return fromAddress;
    const title = safeText(property.title);
    if (!title) return { street: '', streetNumber: '' };
    return splitStreetAndNumber(title, '');
};

const formatContactMethod = (method) => {
    const normalized = String(method || '').toLowerCase();
    if (normalized === 'whatsapp') return 'WhatsApp';
    if (normalized === 'phone') return 'Phone';
    return 'Email';
};

const getLocationLine = (address = {}) => {
    const city = safeText(address.city);
    const state = safeText(address.state);
    const zip = safeText(address.zip);
    const nonIsraelCountry = safeText(address.country).toLowerCase() === 'israel' ? '' : safeText(address.country);
    const parts = dedupeCaseInsensitive([city, state, zip, nonIsraelCountry]);
    return parts.join(', ');
};

const getListingContact = (property = {}) => {
    const externalContact = property.externalContact && typeof property.externalContact === 'object'
        ? property.externalContact
        : {};
    const directContact = property.contact && typeof property.contact === 'object'
        ? property.contact
        : {};
    const agentContact = property.agent && typeof property.agent === 'object' && !Array.isArray(property.agent)
        ? property.agent
        : {};

    const name = dedupeRepeatingPhrase(externalContact.name || directContact.name || agentContact.name || '');
    const agency = dedupeRepeatingPhrase(externalContact.agency || directContact.agency || agentContact.agency || '');
    const phone = externalContact.phone || directContact.phone || agentContact.phone || '';
    const whatsapp = externalContact.whatsapp || directContact.whatsapp || '';
    const email = externalContact.email || directContact.email || agentContact.email || '';
    const preferredMethod =
        externalContact.preferredMethod
        || directContact.preferredMethod
        || (whatsapp ? 'whatsapp' : (phone ? 'phone' : (email ? 'email' : '')));

    return {
        name,
        agency,
        phone,
        whatsapp,
        email,
        preferredMethod,
        hasAny: Boolean(name || agency || phone || whatsapp || email),
    };
};

const normalizePhoneForLinks = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const cleaned = raw.replace(/[^\d+]/g, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('+')) return cleaned.slice(1);
    if (cleaned.startsWith('0')) return `972${cleaned.slice(1)}`;
    return cleaned;
};

const buildWhatsAppHref = (phone, title = 'this listing') => {
    const normalizedPhone = normalizePhoneForLinks(phone);
    if (!normalizedPhone) return '';
    return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(`Hi, I am interested in ${title}.`)}`;
};

const getDisplayWhatsApp = (contact = {}) => {
    const raw = safeText(contact.whatsapp || contact.phone);
    return raw;
};

const hasAnyPattern = (text, patterns) => patterns.some((pattern) => pattern.test(text));

const buildAmenities = (property = {}) => {
    const haystack = String(property.description || '').toLowerCase();
    const amenities = [];
    const addAmenity = (label, condition) => {
        if (!condition || amenities.includes(label)) return;
        amenities.push(label);
    };

    addAmenity('Modern kitchen', hasAnyPattern(haystack, [/kitchen/i, /מטבח/]));
    addAmenity('Air conditioning', hasAnyPattern(haystack, [/air\s*condition/i, /\bac\b/i, /מזגן/, /מיזוג/]));
    addAmenity('Balcony', hasAnyPattern(haystack, [/balcony/i, /מרפסת/]));
    addAmenity('Secure parking', hasAnyPattern(haystack, [/parking/i, /חניה/]));
    addAmenity('Safe room', hasAnyPattern(haystack, [/safe\s*room/i, /\bmamad\b/i, /ממד/]));
    addAmenity('Elevator', hasAnyPattern(haystack, [/elevator/i, /lift/i, /מעלית/]));
    addAmenity('Renovated', hasAnyPattern(haystack, [/renovat/i, /משופצ/]));
    addAmenity('Secure building', Boolean(property.buildingDetails?.name));

    if (amenities.length === 0) {
        if (property.type === 'rental') {
            amenities.push('Modern kitchen', 'Air conditioning', 'Balcony');
        } else {
            amenities.push('Secure building', 'Modern kitchen', 'Balcony');
        }
    }
    return amenities.slice(0, 4);
};

const sanitizeImageSource = (url) => {
    const source = String(url || '').trim();
    if (!source) return '';
    // Keep the original image dimensions so photos are not side-truncated.
    return source;
};

const PropertyDetail = () => {
    const { id } = useParams();
    const history = useHistory();
    const { isAuthenticated, user } = useAuth();
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const isManualListing = property?.sourceType === 'manual';
    const canManageListing = Boolean(
        isAuthenticated && (
            (property?.owner && user?._id && String(property.owner) === String(user._id))
            || ['agent', 'admin'].includes(user?.role)
        )
    );
    const [inquiry, setInquiry] = useState({
        name: '',
        email: '',
        phone: '',
        preferredMethod: 'email',
        message: '',
    });
    const [inquiryStatus, setInquiryStatus] = useState('');
    const [showingForms, setShowingForms] = useState({});
    const [showingStatus, setShowingStatus] = useState({});
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                const result = await getProperty(id);
                setProperty(result.data);
            } catch (err) {
                if (err.response?.status === 404) {
                    setError('Property not found.');
                } else {
                    setError(err.response?.data?.message || 'Failed to load property. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProperty();
    }, [id]);

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this listing?')) return;
        try {
            await deleteProperty(id);
            history.push('/');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete property.');
        }
    };

    const handleInquirySubmit = async (e) => {
        e.preventDefault();
        setInquiryStatus('');
        try {
            await createPropertyInquiry(id, inquiry);
            setInquiryStatus('Inquiry sent to the listing owner.');
            setInquiry({
                name: '',
                email: '',
                phone: '',
                preferredMethod: 'email',
                message: '',
            });
            const result = await getProperty(id);
            setProperty(result.data);
        } catch (err) {
            setInquiryStatus(err.response?.data?.message || 'Failed to send inquiry.');
        }
    };

    const handleShowingInput = (showingId, field, value) => {
        setShowingForms((prev) => ({
            ...prev,
            [showingId]: {
                ...(prev[showingId] || { name: '', email: '', phone: '', message: '' }),
                [field]: value,
            },
        }));
    };

    const handleShowingSubmit = async (e, showingId) => {
        e.preventDefault();
        setShowingStatus((prev) => ({ ...prev, [showingId]: '' }));
        const payload = showingForms[showingId] || {};
        try {
            await registerShowingAttendee(id, showingId, payload);
            setShowingStatus((prev) => ({ ...prev, [showingId]: 'You are registered for this showing.' }));
            setShowingForms((prev) => ({
                ...prev,
                [showingId]: { name: '', email: '', phone: '', message: '' },
            }));
            const refreshed = await getProperty(id);
            setProperty(refreshed.data);
        } catch (err) {
            setShowingStatus((prev) => ({
                ...prev,
                [showingId]: err.response?.data?.message || 'Failed to register for this showing.',
            }));
        }
    };

    if (loading) return <p className="status-message">Loading property details…</p>;
    if (error) return <p className="status-message status-message-error">{error}</p>;
    if (!property) return null;

    const addressLine = getAddressLine(property.address);
    const locationLine = getLocationLine(property.address);
    const allImages = (Array.isArray(property.images) ? property.images : [])
        .map((image) => sanitizeImageSource(image))
        .filter(Boolean);
    const heroImage =
        allImages[0] ||
        'https://picsum.photos/seed/homekey-fallback-detail/1200/620';
    const additionalImages = allImages.slice(1);
    const detailTitle = getPrimaryAddressTitle(property);
    const coverStreetParts = getPrimaryStreetParts(property);
    const coverTitleStreet = coverStreetParts.street || detailTitle;
    const coverTitleNumber = coverStreetParts.streetNumber;
    const typeLabel = property.type === 'rental' ? 'Rental' : 'For Sale';
    const isRental = property.type === 'rental';
    const isYad2ListingMedia = isYad2LikeListing(property);
    const listingContact = getListingContact(property);
    const managerWhatsAppDisplay = getDisplayWhatsApp(listingContact);
    const managerWhatsAppHref = buildWhatsAppHref(managerWhatsAppDisplay, detailTitle);
    const amenities = buildAmenities(property);

    const openImageViewer = (index) => {
        if (allImages.length === 0) return;
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

    const profileSections = [
        {
            title: 'Specifications',
            items: [
                { label: 'Bedrooms', value: property.bedrooms ?? '—' },
                { label: 'Bathrooms', value: property.bathrooms ?? '—' },
                { label: 'Size', value: property.size ? `${property.size} sqm` : '—' },
                { label: 'Floor', value: property.floorNumber ?? '—' },
                { label: 'Status', value: property.status || '—' },
                { label: 'Type', value: typeLabel },
            ],
        },
        ...(!isRental ? [{
            title: 'Financial Profile',
            items: [
                { label: 'Listing Price', value: formatCurrency(property.price) },
                { label: 'Total Monthly Payment', value: formatCurrency(property.financialDetails?.totalMonthlyPayment) },
                { label: 'Vaad (HOA)', value: formatCurrency(property.financialDetails?.vaadAmount) },
                { label: 'City Taxes', value: formatCurrency(property.financialDetails?.cityTaxes) },
                { label: 'Maintenance Fees', value: formatCurrency(property.financialDetails?.maintenanceFees) },
                { label: 'Property Tax', value: formatCurrency(property.financialDetails?.propertyTax) },
            ],
        }] : []),
        {
            title: 'Building Details',
            items: [
                { label: 'Building Name', value: property.buildingDetails?.name || '—' },
                { label: 'Total Floors', value: property.buildingDetails?.floorCount ?? '—' },
                { label: 'Apartment Count', value: property.buildingDetails?.apartmentCount ?? '—' },
            ],
        },
        {
            title: 'Availability & Dates',
            items: [
                { label: 'Available From', value: formatDate(property.dates?.availableFrom) },
                { label: 'Listing Date', value: formatDate(property.dates?.listingDate) },
                { label: 'Expires At', value: formatDate(property.lifecycle?.expiresAt) },
                { label: 'Created At', value: formatDate(property.createdAt) },
                { label: 'Updated At', value: formatDate(property.updatedAt) },
            ],
        },
    ];

    return (
        <div className="property-detail-page">
            <div className="detail-shell">
                <button className="ghost-button" onClick={() => history.push('/')}>
                    ← Back to listings
                </button>

                <section className="detail-hero-card">
                    <div className="detail-hero-image-wrap">
                        <img
                            className={`detail-hero-image ${isYad2ListingMedia ? 'yad2-image' : ''}`}
                            src={heroImage}
                            alt={detailTitle || 'Property'}
                            role="button"
                            tabIndex={0}
                            onClick={() => openImageViewer(0)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    openImageViewer(0);
                                }
                            }}
                        />
                        {isYad2ListingMedia && (
                            <span className="yad2-logo-mask yad2-logo-mask--hero" aria-hidden="true" />
                        )}
                    </div>
                    <div className="homekey-logo-badge" aria-label="HomeKey logo">
                        <div className="homekey-logo-badge-mark" aria-hidden="true">
                            <svg viewBox="0 0 64 64" role="img" aria-hidden="true" focusable="false">
                                <path d="M10 30 32 12l22 18v20a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V30Z" />
                                <rect x="27" y="34" width="10" height="20" rx="2" />
                                <circle cx="46" cy="46" r="7.5" />
                                <rect x="48.5" y="45.2" width="11" height="3.6" rx="1.8" />
                            </svg>
                        </div>
                        <div className="homekey-logo-badge-text">
                            <strong className="homekey-logo-wordmark">HomeKey</strong>
                            <small className="homekey-logo-submark">Real Estate Platform</small>
                        </div>
                    </div>
                    <div className="detail-hero-content">
                        <div className="detail-hero-main">
                            <p className="detail-type-pill">{typeLabel}</p>
                            <h1 className="detail-address-title">
                                <span className="detail-address-title-street" dir="auto">{coverTitleStreet}</span>
                                {coverTitleNumber && (
                                    <span className="detail-address-title-number" dir="ltr">{coverTitleNumber}</span>
                                )}
                            </h1>
                            <p className="detail-address detail-address--hero">
                                {locationLine || addressLine || 'Address not provided'}
                            </p>
                            <div className="detail-highlight-row detail-highlight-row--framed">
                                <span>
                                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                        <path d="M4 9.5A2.5 2.5 0 0 1 6.5 7h11A2.5 2.5 0 0 1 20 9.5V16H4V9.5Zm2.5-.5a.5.5 0 0 0-.5.5V14h12V9.5a.5.5 0 0 0-.5-.5h-11Z" />
                                        <rect x="2" y="16" width="20" height="2" rx="1" />
                                    </svg>
                                    {property.bedrooms ?? '—'} bed
                                </span>
                                <span>
                                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                        <path d="M7 12.5V10a5 5 0 0 1 10 0v2.5a4.5 4.5 0 1 1-10 0Zm2 0a2.5 2.5 0 1 0 5 0V10a3 3 0 0 0-6 0v2.5Z" />
                                    </svg>
                                    {property.bathrooms ?? '—'} bath
                                </span>
                                <span>
                                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                        <path d="M4 4h6v2H6v4H4V4Zm10 0h6v6h-2V6h-4V4ZM4 14h2v4h4v2H4v-6Zm14 0h2v6h-6v-2h4v-4Z" />
                                    </svg>
                                    {property.size ? `${property.size} sqm` : '—'}
                                </span>
                            </div>
                        </div>
                        <section className="detail-amenities-panel" aria-label="Amenities">
                            <h3>Amenities</h3>
                            <ul className="detail-amenities-list">
                                {amenities.map((amenity) => (
                                    <li key={amenity}>{amenity}</li>
                                ))}
                            </ul>
                        </section>
                        <div className="detail-price-box">
                            <p>Price</p>
                            <strong>{formatCurrency(property.price)}</strong>
                        </div>
                    </div>
                </section>

                {additionalImages.length > 0 && (
                    <section className="detail-gallery-grid">
                        {additionalImages.map((image, index) => (
                            <button
                                key={index}
                                type="button"
                                className="detail-gallery-image-button"
                                onClick={() => openImageViewer(index + 1)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        openImageViewer(index + 1);
                                    }
                                }}
                            >
                                <img
                                    className={isYad2ListingMedia ? 'yad2-image' : ''}
                                    src={image}
                                    alt={`Property visual ${index + 2}`}
                                />
                                {isYad2ListingMedia && (
                                    <span className="yad2-logo-mask yad2-logo-mask--gallery" aria-hidden="true" />
                                )}
                            </button>
                        ))}
                    </section>
                )}

                {isReadableImportedText(property, property.description) && (
                    <section className="detail-section-card">
                        <h2>About this property</h2>
                        <p className="detail-description">{property.description}</p>
                    </section>
                )}

                <section className="profile-grid">
                    {profileSections.map((section) => (
                        <div className="profile-card" key={section.title}>
                            <h3>{section.title}</h3>
                            <dl>
                                {section.items.map((item) => (
                                    <div className="profile-row" key={item.label}>
                                        <dt>{item.label}</dt>
                                        <dd>{item.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    ))}
                </section>

                {property.agent && (
                    <section className="detail-section-card">
                        <h2>Agent Contact</h2>
                        <div className="agent-grid">
                            <div>
                                <p className="agent-name">{property.agent.name}</p>
                                {property.agent.agency && <p>{property.agent.agency}</p>}
                            </div>
                            <div>
                                {property.agent.phone && <p>Phone: {property.agent.phone}</p>}
                                {property.agent.email && <p>Email: {property.agent.email}</p>}
                            </div>
                        </div>
                    </section>
                )}

                {listingContact.hasAny && (
                    <section className="detail-section-card">
                        <div id="contact-manager-form" />
                        <h2>Contact Listing Manager</h2>
                        <p>
                            Preferred method:{' '}
                            {formatContactMethod(listingContact.preferredMethod)}
                        </p>
                        <div className="agent-grid">
                            {listingContact.name && <p>Manager: {listingContact.name}</p>}
                            {listingContact.agency && <p>Agency: {listingContact.agency}</p>}
                            {listingContact.phone && <p>Phone: {listingContact.phone}</p>}
                            {managerWhatsAppDisplay && <p>WhatsApp: {managerWhatsAppDisplay}</p>}
                            {listingContact.email && <p>Email: {listingContact.email}</p>}
                        </div>
                        <div className="detail-contact-actions">
                            {managerWhatsAppHref && (
                                <a
                                    href={managerWhatsAppHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="secondary-btn"
                                >
                                    Chat on WhatsApp
                                </a>
                            )}
                            {listingContact.email && (
                                <a href={`mailto:${listingContact.email}`} className="secondary-btn">
                                    Send Message
                                </a>
                            )}
                        </div>
                        <form onSubmit={handleInquirySubmit}>
                            <div className="input-field">
                                <label>Your Name</label>
                                <input
                                    type="text"
                                    value={inquiry.name}
                                    onChange={(e) => setInquiry((prev) => ({ ...prev, name: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="input-field">
                                <label>Your Email</label>
                                <input
                                    type="email"
                                    value={inquiry.email}
                                    onChange={(e) => setInquiry((prev) => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div className="input-field">
                                <label>Your Phone</label>
                                <input
                                    type="tel"
                                    value={inquiry.phone}
                                    onChange={(e) => setInquiry((prev) => ({ ...prev, phone: e.target.value }))}
                                />
                            </div>
                            <div className="input-field">
                                <label>Preferred Contact Method</label>
                                <select
                                    value={inquiry.preferredMethod}
                                    onChange={(e) => setInquiry((prev) => ({ ...prev, preferredMethod: e.target.value }))}
                                >
                                    <option value="email">Email</option>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="phone">Phone</option>
                                </select>
                            </div>
                            <div className="input-field">
                                <label>Message</label>
                                <textarea
                                    value={inquiry.message}
                                    onChange={(e) => setInquiry((prev) => ({ ...prev, message: e.target.value }))}
                                    required
                                />
                            </div>
                            <button type="submit" className="primary-button">Send Inquiry</button>
                            {inquiryStatus && <p>{inquiryStatus}</p>}
                        </form>
                    </section>
                )}

                {Array.isArray(property.showings) && property.showings.length > 0 && (
                    <section className="detail-section-card">
                        <h2>Property Showings</h2>
                        {property.showings.map((showing) => {
                            const attendeeCount = Array.isArray(showing.attendees) ? showing.attendees.length : 0;
                            const formState = showingForms[showing._id] || {};
                            return (
                                <div key={showing._id} style={{ border: '1px solid #ddd', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                                    <p><strong>Starts:</strong> {new Date(showing.startsAt).toLocaleString()}</p>
                                    <p><strong>Ends:</strong> {new Date(showing.endsAt).toLocaleString()}</p>
                                    <p><strong>Available spots:</strong> {Math.max((showing.attendeeLimit || 20) - attendeeCount, 0)}</p>
                                    {showing.notes && <p>{showing.notes}</p>}
                                    <form onSubmit={(e) => handleShowingSubmit(e, showing._id)}>
                                        <div className="input-field">
                                            <label>Your Name</label>
                                            <input
                                                type="text"
                                                value={formState.name || ''}
                                                onChange={(e) => handleShowingInput(showing._id, 'name', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="input-field">
                                            <label>Your Email</label>
                                            <input
                                                type="email"
                                                value={formState.email || ''}
                                                onChange={(e) => handleShowingInput(showing._id, 'email', e.target.value)}
                                            />
                                        </div>
                                        <div className="input-field">
                                            <label>Your Phone</label>
                                            <input
                                                type="tel"
                                                value={formState.phone || ''}
                                                onChange={(e) => handleShowingInput(showing._id, 'phone', e.target.value)}
                                            />
                                        </div>
                                        <div className="input-field">
                                            <label>Message (optional)</label>
                                            <input
                                                type="text"
                                                value={formState.message || ''}
                                                onChange={(e) => handleShowingInput(showing._id, 'message', e.target.value)}
                                            />
                                        </div>
                                        <button type="submit" className="primary-button">Reserve Showing Slot</button>
                                        {showingStatus[showing._id] && <p>{showingStatus[showing._id]}</p>}
                                    </form>
                                </div>
                            );
                        })}
                    </section>
                )}

                {canManageListing && isManualListing && (
                    <div className="detail-actions">
                        <button className="secondary-btn" onClick={() => history.push(`/properties/${property._id}/engagement`)}>
                            View inquiries & attendee list
                        </button>
                        <button className="primary-button" onClick={() => history.push(`/edit-listing/${property._id}`)}>
                            Edit Listing
                        </button>
                        <button className="danger-button" onClick={handleDelete}>
                            Delete Listing
                        </button>
                    </div>
                )}
            </div>
            {selectedImageIndex != null && allImages[selectedImageIndex] && (
                <div className="image-lightbox-backdrop" onClick={closeImageViewer}>
                    <div className="image-lightbox-toolbar" onClick={(e) => e.stopPropagation()}>
                        <span>{selectedImageIndex + 1} / {allImages.length}</span>
                        <button className="image-lightbox-close" onClick={closeImageViewer} type="button">Close</button>
                    </div>
                    <div className="image-lightbox-image-wrap" onClick={(e) => e.stopPropagation()}>
                        <img
                            className={isYad2ListingMedia ? 'yad2-image' : ''}
                            src={allImages[selectedImageIndex]}
                            alt={`Property image ${selectedImageIndex + 1}`}
                        />
                        {allImages.length > 1 && (
                            <>
                                <button
                                    className="image-lightbox-nav prev"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        showPrevImage();
                                    }}
                                    type="button"
                                >
                                    ‹
                                </button>
                                <button
                                    className="image-lightbox-nav next"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        showNextImage();
                                    }}
                                    type="button"
                                >
                                    ›
                                </button>
                            </>
                        )}
                        {isYad2ListingMedia && (
                            <span className="yad2-logo-mask yad2-logo-mask--lightbox" aria-hidden="true" />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyDetail;
