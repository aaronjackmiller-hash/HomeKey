import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProperty } from '../utils/api';
import './PropertyDetail.css';

const PLACEHOLDER = 'https://via.placeholder.com/800x500?text=No+Image';

function PropertyDetail() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getProperty(id)
      .then(setProperty)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="status-msg">Loading…</p>;
  if (error) return <p className="status-msg error">Error: {error}</p>;
  if (!property) return <p className="status-msg">Property not found.</p>;

  return (
    <div className="property-detail">
      <Link to="/" className="back-link">← Back to listings</Link>
      <img
        className="detail-img"
        src={property.images && property.images[0] ? property.images[0] : PLACEHOLDER}
        alt={property.address}
      />
      <div className="detail-body">
        <span className={`badge ${property.type}`}>
          {property.type === 'rental' ? 'Rental' : 'For Sale'}
        </span>
        <h2>{property.address}</h2>
        <p className="price">
          {property.type === 'rental'
            ? `$${property.price.toLocaleString()}/month`
            : `$${property.price.toLocaleString()}`}
        </p>
        <p className="meta">
          {property.bedrooms} Bedrooms · {property.bathrooms} Bathrooms
        </p>
        {property.description && (
          <p className="description">{property.description}</p>
        )}
      </div>
    </div>
  );
}

export default PropertyDetail;
