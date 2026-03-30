import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProperty } from '../utils/api';

function PropertyDetail() {
    const { id } = useParams();
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        getProperty(id)
            .then(data => setProperty(data))
            .catch(() => setError('Failed to load property.'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <p>Loading...</p>;
    if (error) return <p className="error">{error}</p>;
    if (!property) return <p>Property not found.</p>;

    return (
        <div className="property-detail">
            <Link to="/" className="btn back-btn">&larr; Back to Listings</Link>
            {property.images && property.images.length > 0 && (
                <div className="detail-images">
                    {property.images.map((img, i) => (
                        <img key={i} src={img} alt={`${property.address} - ${i + 1}`} className="detail-image" />
                    ))}
                </div>
            )}
            <h2>{property.address}</h2>
            <p className="property-price">${property.price.toLocaleString()}</p>
            <p>{property.bedrooms} Bedrooms &bull; {property.bathrooms} Bathrooms</p>
        </div>
    );
}

export default PropertyDetail;
