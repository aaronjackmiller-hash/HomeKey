import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { getProperty, deleteProperty } from '../services/api';
import { useAuth } from '../context/AuthContext';

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

    if (loading) return <p>Loading…</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;
    if (!property) return null;

    return (
        <div className="property-detail" style={{ maxWidth: '800px', margin: '20px auto', padding: '0 20px' }}>
            <button onClick={() => history.push('/')} style={{ marginBottom: '16px' }}>&larr; Back to listings</button>
            <h1>{property.title}</h1>
            <p>{property.address?.street}{property.address?.city ? `, ${property.address.city}` : ''}{property.address?.state ? `, ${property.address.state}` : ''}{property.address?.zip ? ` ${property.address.zip}` : ''}</p>

            {property.images && property.images.length > 0 && (
                <div className="image-gallery" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {property.images.map((image, index) => (
                        <img key={index} src={image} alt={`Property Image ${index + 1}`} style={{ width: '200px', height: '150px', objectFit: 'cover', borderRadius: '4px' }} />
                    ))}
                </div>
            )}

            <div className="specs">
                <h2>Specifications</h2>
                <p>{property.bedrooms} bedrooms &bull; {property.bathrooms} bathrooms &bull; {property.size} sqm &bull; Floor {property.floorNumber ?? '—'}</p>
                {property.description && <p>{property.description}</p>}
                <p>Status: <strong>{property.status}</strong> &bull; Type: <strong>{property.type === 'rental' ? 'Rental' : 'For Sale'}</strong></p>
            </div>

            <div className="financials">
                <h2>Financials</h2>
                <p>Price: <strong>₪{property.price?.toLocaleString()}</strong></p>
                {property.financialDetails?.totalMonthlyPayment != null && (
                    <p>Total Monthly Payment: ₪{property.financialDetails.totalMonthlyPayment?.toLocaleString()}</p>
                )}
                {property.financialDetails?.vaadAmount != null && (
                    <p>Vaad (HOA): ₪{property.financialDetails.vaadAmount?.toLocaleString()}</p>
                )}
                {property.financialDetails?.cityTaxes != null && (
                    <p>City Taxes: ₪{property.financialDetails.cityTaxes?.toLocaleString()}</p>
                )}
                {property.financialDetails?.maintenanceFees != null && (
                    <p>Maintenance Fees: ₪{property.financialDetails.maintenanceFees?.toLocaleString()}</p>
                )}
                {property.financialDetails?.propertyTax != null && (
                    <p>Property Tax: ₪{property.financialDetails.propertyTax?.toLocaleString()}</p>
                )}
            </div>

            {(property.buildingDetails?.name || property.buildingDetails?.floorCount != null || property.buildingDetails?.apartmentCount != null) && (
                <div className="building-details">
                    <h2>Building Details</h2>
                    {property.buildingDetails?.name && <p>Building: {property.buildingDetails.name}</p>}
                    {property.buildingDetails?.floorCount != null && <p>Total Floors: {property.buildingDetails.floorCount}</p>}
                    {property.buildingDetails?.apartmentCount != null && <p>Total Apartments: {property.buildingDetails.apartmentCount}</p>}
                </div>
            )}

            {property.dates?.availableFrom && (
                <div className="availability">
                    <h2>Availability</h2>
                    <p>Available from: {new Date(property.dates.availableFrom).toLocaleDateString()}</p>
                </div>
            )}

            {property.agent && (
                <div className="agent-contact">
                    <h2>Contact Agent</h2>
                    <p>{property.agent.name}</p>
                    {property.agent.phone && <p>{property.agent.phone}</p>}
                    {property.agent.email && <p>{property.agent.email}</p>}
                </div>
            )}

            {isAuthenticated && (
                <div style={{ marginTop: '24px' }}>
                    <button onClick={() => history.push(`/edit-listing/${property._id}`)} style={{ marginRight: '12px' }}>Edit Listing</button>
                    <button onClick={handleDelete} style={{ background: '#e53e3e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>Delete Listing</button>
                </div>
            )}
        </div>
    );
};

export default PropertyDetail;

