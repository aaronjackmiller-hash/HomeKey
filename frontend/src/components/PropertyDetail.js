import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { getProperty, deleteProperty } from '../services/api';
import { useAuth } from '../context/AuthContext';

const formatCurrency = (value) => {
    if (value == null || Number.isNaN(Number(value))) return '—';
    return `₪${Number(value).toLocaleString()}`;
};

const formatDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
};

const getAddressLine = (address) =>
    [address?.street, address?.city, address?.state, address?.zip].filter(Boolean).join(', ');

const PropertyDetail = () => {
    const { id } = useParams();
    const history = useHistory();
    const { isAuthenticated } = useAuth();
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    if (loading) return <p className="status-message">Loading property details…</p>;
    if (error) return <p className="status-message status-message-error">{error}</p>;
    if (!property) return null;

    const addressLine = getAddressLine(property.address);
    const heroImage =
        (Array.isArray(property.images) && property.images[0]) ||
        'https://picsum.photos/seed/homekey-fallback-detail/1200/620';
    const additionalImages = Array.isArray(property.images) ? property.images.slice(1) : [];
    const typeLabel = property.type === 'rental' ? 'Rental' : 'For Sale';

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
        {
            title: 'Financial Profile',
            items: [
                { label: 'Listing Price', value: formatCurrency(property.price) },
                { label: 'Total Monthly Payment', value: formatCurrency(property.financialDetails?.totalMonthlyPayment) },
                { label: 'Vaad (HOA)', value: formatCurrency(property.financialDetails?.vaadAmount) },
                { label: 'City Taxes', value: formatCurrency(property.financialDetails?.cityTaxes) },
                { label: 'Maintenance Fees', value: formatCurrency(property.financialDetails?.maintenanceFees) },
                { label: 'Property Tax', value: formatCurrency(property.financialDetails?.propertyTax) },
            ],
        },
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
                    <img className="detail-hero-image" src={heroImage} alt={property.title || 'Property'} />
                    <div className="detail-hero-content">
                        <div>
                            <p className="detail-type-pill">{typeLabel}</p>
                            <h1>{property.title || 'Untitled property'}</h1>
                            <p className="detail-address">{addressLine || 'Address not provided'}</p>
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
                            <img key={index} src={image} alt={`Property visual ${index + 2}`} />
                        ))}
                    </section>
                )}

                {property.description && (
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

                {isAuthenticated && (
                    <div className="detail-actions">
                        <button className="primary-button" onClick={() => history.push(`/edit-listing/${property._id}`)}>
                            Edit Listing
                        </button>
                        <button className="danger-button" onClick={handleDelete}>
                            Delete Listing
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PropertyDetail;
