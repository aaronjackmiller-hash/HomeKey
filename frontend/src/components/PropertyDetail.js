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

const getAddressLine = (address) => {
    const streetName = safeText(address?.street);
    const streetNumber = safeText(address?.streetNumber);
    const street = dedupeCaseInsensitive([streetName, streetNumber]).join(' ');
    const city = safeText(address?.city);
    const state = safeText(address?.state);
    const zip = safeText(address?.zip);
    const nonIsraelCountry = safeText(address?.country).toLowerCase() === 'israel' ? '' : safeText(address?.country);
    const parts = dedupeCaseInsensitive([street, city, state, zip, nonIsraelCountry]);
    return parts.join(', ');
};

const getPrimaryAddressTitle = (property = {}) => {
    const street = String(property.address?.street || '').trim();
    if (street) return street;
    const title = String(property.title || '').trim();
    if (isReadableImportedText(property, title)) return title;
    const city = safeText(property.address?.city);
    return city ? `Property in ${city}` : 'Property listing';
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

const sanitizeImageSource = (url) => {
    const source = String(url || '').trim();
    if (!source) return '';
    // Yad2 listing photos may contain top-left badges/logos. Crop top region from
    // every listing image to consistently hide branding overlays regardless of host.
    const separator = source.includes('?') ? '&' : '?';
    return `${source}${separator}fit=crop&crop=entropy&crop-top=14&h=860`;
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
    const typeLabel = property.type === 'rental' ? 'Rental' : 'For Sale';
    const isRental = property.type === 'rental';
    const isYad2ListingMedia = isYad2LikeListing(property);
    const listingContact = getListingContact(property);
    const managerWhatsAppHref = buildWhatsAppHref(listingContact.whatsapp || listingContact.phone, detailTitle);

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
                    <div className={`detail-hero-image-wrap ${isYad2ListingMedia ? 'yad2-image-wrap' : ''}`}>
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
                    </div>
                    <div className="detail-hero-content">
                        <div>
                            <p className="detail-type-pill">{typeLabel}</p>
                            <h1>{detailTitle}</h1>
                            <p className="detail-address">
                                {locationLine || addressLine || 'Address not provided'}
                            </p>
                            <div className="detail-highlight-row">
                                <span>{property.bedrooms ?? '—'} bed</span>
                                <span>{property.bathrooms ?? '—'} bath</span>
                                <span>{property.size ? `${property.size} sqm` : '—'}</span>
                            </div>
                        </div>
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
                                className={`detail-gallery-image-button ${isYad2ListingMedia ? 'yad2-image-wrap' : ''}`}
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
                            {listingContact.whatsapp && <p>WhatsApp: {listingContact.whatsapp}</p>}
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
                    <div className="image-lightbox-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="image-lightbox-toolbar">
                            <span>{selectedImageIndex + 1} / {allImages.length}</span>
                            <button className="image-lightbox-close" onClick={closeImageViewer} type="button">Close</button>
                        </div>
                        <div className={`image-lightbox-stage ${isYad2ListingMedia ? 'yad2-stage' : ''}`}>
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
                    <img
                        className={isYad2ListingMedia ? 'yad2-image' : ''}
                        src={allImages[selectedImageIndex]}
                        alt={`Property image ${selectedImageIndex + 1}`}
                        onClick={(e) => e.stopPropagation()}
                    />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyDetail;
