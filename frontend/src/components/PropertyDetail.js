import React, { useState, useEffect } from 'react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import {
    getProperty,
    deleteProperty,
    createPropertyInquiry,
    registerShowingAttendee,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import HomeKeyLogoBadge from './HomeKeyLogoBadge';
import PropertyInquiryCard from './PropertyInquiryCard';
import SAMPLE_PROPERTIES from '../data/sampleProperties';
import {
    isFavoriteProperty,
    toggleFavoriteProperty,
} from '../utils/propertyInterest';
import { getPropertyId } from '../utils/propertyIdentity';
import { pickBestContactName } from '../utils/contactMessaging';

const LIVE_LISTINGS_CACHE_KEY = 'homekey:live-listings-cache:v1';

const formatCurrency = (value) => {
    if (value == null || Number.isNaN(Number(value))) return '—';
    return `₪${Number(value).toLocaleString()}`;
};

const formatTemplatePrice = (value) => {
    if (value == null || Number.isNaN(Number(value))) return '—';
    return Number(value).toLocaleString();
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

const normalizeRegionToken = (value) => safeText(value)
    .toLowerCase()
    .replace(/[-־/]/g, ' ')
    .replace(/\b(district|region)\b/g, ' ')
    .replace(/מחוז/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isRedundantStateForCity = (cityValue = '', stateValue = '') => {
    const city = normalizeRegionToken(cityValue);
    const state = normalizeRegionToken(stateValue);
    if (!city || !state) return false;
    return city === state || city.includes(state) || state.includes(city);
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

const getLocationLine = (address = {}) => {
    const neighborhood = safeText(address.neighborhood);
    const city = safeText(address.city);
    const rawState = safeText(address.state);
    const state = isRedundantStateForCity(city, rawState) ? '' : rawState;
    const zip = safeText(address.zip);
    const nonIsraelCountry = safeText(address.country).toLowerCase() === 'israel' ? '' : safeText(address.country);
    const parts = dedupeCaseInsensitive([neighborhood, city, state, zip, nonIsraelCountry]);
    return parts.join(', ');
};

const splitNameForInquiry = (fullName = '') => {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
    };
};

const buildMessageWithUserNote = (automatedMessage = '', userNote = '') => {
    const frozenMessage = safeText(automatedMessage);
    const note = safeText(userNote);
    if (!frozenMessage) return note;
    if (!note) return frozenMessage;
    return `${frozenMessage}\n\n${note}`;
};

const buildInquiryDefaultsFromUser = (authUser, isAuthenticated) => {
    if (!isAuthenticated || !authUser) {
        return {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
        };
    }

    const { firstName, lastName } = splitNameForInquiry(authUser.name);
    return {
        firstName,
        lastName,
        email: safeText(authUser.email),
        phone: safeText(authUser.phone || authUser.whatsapp),
    };
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

    const name = pickBestContactName({
        directName: directContact.name,
        agentName: agentContact.name,
        externalName: externalContact.name,
    });
    const agency = dedupeRepeatingPhrase(agentContact.agency || directContact.agency || externalContact.agency || '');
    const phone = agentContact.phone || directContact.phone || externalContact.phone || '';
    const whatsapp = agentContact.whatsapp || directContact.whatsapp || externalContact.whatsapp || '';
    const email = agentContact.email || directContact.email || externalContact.email || '';
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

const getCachedLiveListingById = (id) => {
    if (!id || typeof window === 'undefined' || !window.localStorage) return null;
    try {
        const raw = window.localStorage.getItem(LIVE_LISTINGS_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return parsed.find((item) => getPropertyId(item) === id) || null;
    } catch (_err) {
        return null;
    }
};

const normalizeVirtualTourUrl = (value) => {
    const raw = safeText(value);
    if (!raw) return '';
    try {
        const parsed = new URL(raw);
        if (!['http:', 'https:'].includes(parsed.protocol)) return '';
        return parsed.toString();
    } catch (_err) {
        return '';
    }
};

const getVirtualTourEmbedUrl = (tourUrl) => {
    if (!tourUrl) return '';
    try {
        const parsed = new URL(tourUrl);
        const host = parsed.hostname.toLowerCase();

        if (host.includes('youtu.be')) {
            const videoId = parsed.pathname.replace('/', '');
            return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
        }
        if (host.includes('youtube.com')) {
            if (parsed.pathname.startsWith('/embed/')) return parsed.toString();
            const videoId = parsed.searchParams.get('v');
            return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
        }
        if (host.includes('matterport.com')) {
            const modelId = parsed.searchParams.get('m');
            return modelId ? `https://my.matterport.com/show/?m=${modelId}&play=1&brand=0` : '';
        }
        return '';
    } catch (_err) {
        return '';
    }
};

const PropertyDetail = () => {
    const { id } = useParams();
    const history = useHistory();
    const location = useLocation();
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
    const [inquiry, setInquiry] = useState(() => ({
        ...buildInquiryDefaultsFromUser(user, isAuthenticated),
        messageNote: '',
    }));
    const [inquiryStatus, setInquiryStatus] = useState('');
    const [showingForms, setShowingForms] = useState({});
    const [showingStatus, setShowingStatus] = useState({});
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const [, setInterestVersion] = useState(0);

    useEffect(() => {
        const fetchProperty = async () => {
            const normalizedId = String(id || '').trim();
            const isSampleId = normalizedId.startsWith('sample-');
            const previewProperty = location?.state?.previewProperty;
            const previewId = getPropertyId(previewProperty);
            const matchingPreviewProperty = previewId === normalizedId ? previewProperty : null;
            const matchingSampleProperty = SAMPLE_PROPERTIES.find((item) => getPropertyId(item) === normalizedId) || null;
            const matchingCachedProperty = getCachedLiveListingById(normalizedId);
            const fallbackProperty = matchingPreviewProperty || matchingSampleProperty || matchingCachedProperty;

            if (fallbackProperty) {
                setProperty(fallbackProperty);
            }

            if (isSampleId && fallbackProperty) {
                setLoading(false);
                setError('');
                return;
            }

            try {
                const result = await getProperty(id);
                setProperty(result.data);
                setError('');
            } catch (err) {
                if (fallbackProperty) {
                    // Keep rendering the fallback listing so users can still open detail template.
                    setError('');
                } else if (err.response?.status === 404) {
                    setError('Property not found.');
                } else {
                    setError(err.response?.data?.message || 'Failed to load property. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProperty();
    }, [id, location]);

    useEffect(() => {
        const defaults = buildInquiryDefaultsFromUser(user, isAuthenticated);
        setInquiry((prev) => ({
            firstName: prev.firstName || defaults.firstName,
            lastName: prev.lastName || defaults.lastName,
            email: prev.email || defaults.email,
            phone: prev.phone || defaults.phone,
            messageNote: prev.messageNote || '',
        }));
    }, [isAuthenticated, user]);

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
        const fullName = `${inquiry.firstName} ${inquiry.lastName}`.trim();
        if (!fullName) {
            setInquiryStatus('Please provide your first and last name.');
            return;
        }
        const inquiryPayload = {
            name: fullName,
            email: inquiry.email,
            phone: inquiry.phone,
            preferredMethod: 'email',
            message: buildMessageWithUserNote(
                `I am interested in ${detailTitle}. Please send more details.`,
                inquiry.messageNote,
            ),
        };
        try {
            await createPropertyInquiry(id, inquiryPayload);
            setInquiryStatus('Details request sent successfully.');
            setInquiry({
                ...buildInquiryDefaultsFromUser(user, isAuthenticated),
                messageNote: '',
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
    const isRental = property.type === 'rental';
    const isYad2ListingMedia = isYad2LikeListing(property);
    const listingContact = getListingContact(property);
    const amenities = buildAmenities(property);
    const propertyId = getPropertyId(property);
    const virtualTourUrl = normalizeVirtualTourUrl(property.virtualTourUrl);
    const virtualTourEmbedUrl = getVirtualTourEmbedUrl(virtualTourUrl);
    const favoriteActive = isFavoriteProperty(propertyId);
    const handleToggleFavorite = () => {
        if (!propertyId) return;
        toggleFavoriteProperty(property);
        setInterestVersion((value) => value + 1);
    };

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
    ];

    const shouldShowContactSection = true;
    const templateTypeLabel = property.type === 'rental' ? 'Rent' : 'Sale';
    const templateTitle = [coverTitleStreet, coverTitleNumber].filter(Boolean).join(' ').trim() || detailTitle;
    const templateLocation = (
        safeText(property.address?.city)
        || safeText(locationLine.split(',')[0])
        || 'Israel'
    ).toUpperCase();
    const templatePriceSuffix = property.type === 'rental' ? '/mo' : '';
    const templatePriceValue = formatTemplatePrice(property.price);
    const inquirySubtitleRaw = safeText(property.description)
        || `Submit your details and get more information about ${detailTitle}.`;
    const inquirySubtitle = inquirySubtitleRaw.length > 130
        ? `${inquirySubtitleRaw.slice(0, 127)}...`
        : inquirySubtitleRaw;
    const inquiryWhatsAppNumber = String(listingContact.whatsapp || '').replace(/[^\d]/g, '');
    const inquiryFrozenMessage = `Hi, I am interested in ${detailTitle}. Please share more details.`;
    const inquiryAgent = {
        agency: listingContact.agency || 'Real Deal',
        name: listingContact.name || '',
        hasWhatsApp: Boolean(inquiryWhatsAppNumber),
        whatsappNumber: inquiryWhatsAppNumber,
        inquiryMessageTemplate: inquiryFrozenMessage,
        inquiryMessage: buildMessageWithUserNote(inquiryFrozenMessage, inquiry.messageNote),
    };

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
                            <>
                                <span className="yad2-logo-mask yad2-logo-mask--hero" aria-hidden="true" />
                                <span className="detail-h-badge detail-h-badge--hero" aria-hidden="true">
                                    <span className="detail-h-badge-icon" />
                                </span>
                            </>
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
                            <span className="detail-template-type">{templateTypeLabel}</span>
                            <h1 className="detail-template-title" dir="auto">{templateTitle}</h1>
                            <p className="detail-template-location">{templateLocation}</p>
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
                                <span>{property.bedrooms ?? '—'} BED</span>
                            </div>
                            <div className="detail-template-metric">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                    <path d="M5 12h14v4.4A3.6 3.6 0 0 1 15.4 20H8.6A3.6 3.6 0 0 1 5 16.4V12Z" />
                                    <path d="M8 12V8.8A2.8 2.8 0 0 1 10.8 6h1.5a1.7 1.7 0 1 1 0 3.4h-1" />
                                    <path d="M7 20v1.5M17 20v1.5" />
                                    <path d="M16.8 9.2l1.7 1.7M18.5 9.2l-1.7 1.7" />
                                </svg>
                                <span>{property.bathrooms ?? '—'} BATH</span>
                            </div>
                            <div className="detail-template-metric">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                    <path d="M4 4h7v3h3V4h6v16h-6v-4h-4v4H4z" />
                                    <path d="M11 4v5h3" />
                                    <path d="M10 16v-3h4" />
                                    <path d="M6.2 9.4h2M6.2 12h2" />
                                </svg>
                                <span>{property.size ? `${property.size} SQM` : '— SQM'}</span>
                            </div>
                        </div>
                        <section className="detail-template-amenities" aria-label="Amenities">
                            <h3>AMENITIES</h3>
                            <ul>
                                {amenities.map((amenity) => (
                                    <li key={amenity}>{amenity}</li>
                                ))}
                            </ul>
                        </section>
                        <div className="detail-template-price">
                            <div className="detail-template-price-mark">
                                <HomeKeyLogoBadge compact className="detail-template-price-logo detail-template-logo-fill" />
                            </div>
                            <div className="detail-template-price-copy">
                                <p>PRICE</p>
                                <strong>
                                    <span className="detail-template-price-currency">₪</span>
                                    {templatePriceValue}
                                    {templatePriceSuffix && <span className="detail-template-price-suffix">{templatePriceSuffix}</span>}
                                </strong>
                            </div>
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
                                <span className="detail-gallery-image-media">
                                    <img
                                        className={isYad2ListingMedia ? 'yad2-image' : ''}
                                        src={image}
                                        alt={`Property visual ${index + 2}`}
                                    />
                                    {isYad2ListingMedia && (
                                        <>
                                            <span className="yad2-logo-mask yad2-logo-mask--gallery" aria-hidden="true" />
                                            <span className="detail-h-badge detail-h-badge--gallery" aria-hidden="true">
                                                <span className="detail-h-badge-icon" />
                                            </span>
                                        </>
                                    )}
                                </span>
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

                {virtualTourUrl && (
                    <section className="detail-section-card detail-virtual-tour-card">
                        <div className="detail-virtual-tour-header">
                            <h2>3D Virtual Tour</h2>
                            <a href={virtualTourUrl} target="_blank" rel="noopener noreferrer">
                                Open full tour
                            </a>
                        </div>
                        {virtualTourEmbedUrl ? (
                            <div className="detail-virtual-tour-frame-wrap">
                                <iframe
                                    src={virtualTourEmbedUrl}
                                    title={`3D virtual tour for ${detailTitle}`}
                                    className="detail-virtual-tour-frame"
                                    loading="lazy"
                                    allow="autoplay; fullscreen; xr-spatial-tracking"
                                    allowFullScreen
                                />
                            </div>
                        ) : (
                            <p className="detail-virtual-tour-note">
                                This tour provider does not support inline embedding. Use the link above.
                            </p>
                        )}
                    </section>
                )}

                {profileSections.length > 0 && (
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
                )}

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

                {shouldShowContactSection && (
                    <section className="detail-inquiry-section">
                        <div id="contact-manager-form" />
                        <PropertyInquiryCard
                            mode="embedded"
                            title={detailTitle}
                            subtitle={inquirySubtitle}
                            agent={inquiryAgent}
                            formValues={inquiry}
                            onFormChange={(field, value) => setInquiry((prev) => ({ ...prev, [field]: value }))}
                            onSubmit={handleInquirySubmit}
                            statusMessage={inquiryStatus}
                            statusIsError={inquiryStatus.toLowerCase().includes('failed') || inquiryStatus.toLowerCase().includes('please')}
                        />
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

                {canManageListing && isManualListing && propertyId && (
                    <div className="detail-actions">
                        <button className="secondary-btn" onClick={() => history.push(`/properties/${propertyId}/engagement`)}>
                            View inquiries & attendee list
                        </button>
                        <button className="primary-button" onClick={() => history.push(`/edit-listing/${propertyId}`)}>
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
                        <div className="image-lightbox-stage">
                            <div className="image-lightbox-image-wrap">
                                <span className="image-lightbox-image-media">
                                    <img
                                        className={isYad2ListingMedia ? 'yad2-image lightbox-rendered-image' : 'lightbox-rendered-image'}
                                        src={allImages[selectedImageIndex]}
                                        alt={`Property image ${selectedImageIndex + 1}`}
                                    />
                                    {isYad2ListingMedia && (
                                        <>
                                            <span className="detail-h-badge detail-h-badge--lightbox" aria-hidden="true">
                                                <span className="detail-h-badge-icon" />
                                            </span>
                                        </>
                                    )}
                                </span>
                            </div>
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
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyDetail;
