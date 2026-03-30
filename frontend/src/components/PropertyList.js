import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProperties } from '../utils/api';

function PropertyList() {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        getProperties()
            .then(data => setProperties(data))
            .catch(() => setError('Failed to load properties.'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p>Loading properties...</p>;
    if (error) return <p className="error">{error}</p>;
    if (properties.length === 0) return <p>No properties found.</p>;

    return (
        <div className="property-grid">
            {properties.map(p => (
                <div key={p._id} className="property-card">
                    {p.images && p.images[0] && (
                        <img src={p.images[0]} alt={p.address} className="property-image" />
                    )}
                    <div className="property-info">
                        <h3>{p.address}</h3>
                        <p className="property-price">${p.price.toLocaleString()}</p>
                        <p>{p.bedrooms} bed &bull; {p.bathrooms} bath</p>
                        <Link to={`/properties/${p._id}`} className="btn">View Details</Link>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default PropertyList;
