import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProperty } from '../services/api';

const PropertyDetail = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    getProperty(id)
      .then((res) => setProperty(res.data))
      .catch(() => setError('Property not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="status-msg">Loading property...</div>;
  if (error) return <div className="status-msg error">{error}</div>;
  if (!property) return null;

  const formatPrice = (p) =>
    property.propertyType === 'rental'
      ? `₪${p.toLocaleString()}/month`
      : `₪${p.toLocaleString()}`;

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IL', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  return (
    <div className="property-detail-page">
      <Link to="/" className="back-link">← Back to listings</Link>

      <div className="detail-header">
        <div>
          <h2>{property.address}</h2>
          <p className="city">📍 {property.city}</p>
        </div>
        <div className="detail-price">
          <span className={`badge ${property.propertyType}`}>
            {property.propertyType === 'rental' ? 'For Rent' : 'For Sale'}
          </span>
          <div className="price">{formatPrice(property.price)}</div>
        </div>
      </div>

      {/* Image gallery */}
      {property.images && property.images.length > 0 && (
        <div className="image-gallery">
          <img
            className="main-image"
            src={property.images[activeImage]}
            alt={`${property.address} - view ${activeImage + 1}`}
          />
          {property.images.length > 1 && (
            <div className="image-thumbs">
              {property.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`thumb ${i + 1}`}
                  className={i === activeImage ? 'active' : ''}
                  onClick={() => setActiveImage(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {property.description && (
        <div className="detail-section">
          <h3>Description</h3>
          <p className="description">{property.description}</p>
        </div>
      )}

      {/* Key details grid */}
      <div className="detail-section">
        <h3>Property Details</h3>
        <div className="details-grid">
          <div className="detail-item">
            <span className="label">Bedrooms</span>
            <span className="value">🛏 {property.bedrooms}</span>
          </div>
          <div className="detail-item">
            <span className="label">Bathrooms</span>
            <span className="value">🚿 {property.bathrooms}</span>
          </div>
          {property.size != null && (
            <div className="detail-item">
              <span className="label">Size</span>
              <span className="value">📐 {property.size} m²</span>
            </div>
          )}
          {property.floorNumber != null && (
            <div className="detail-item">
              <span className="label">Floor</span>
              <span className="value">🏢 {property.floorNumber}</span>
            </div>
          )}
          <div className="detail-item">
            <span className="label">Elevator</span>
            <span className="value">{property.elevator ? '✅ Yes' : '❌ No'}</span>
          </div>
          <div className="detail-item">
            <span className="label">Mamad (Safe Room)</span>
            <span className="value">{property.mamad ? '✅ Yes' : '❌ No'}</span>
          </div>
          <div className="detail-item">
            <span className="label">Condition</span>
            <span className="value">🏗 {property.propertyCondition}</span>
          </div>
          <div className="detail-item">
            <span className="label">Pets Allowed</span>
            <span className="value">{property.petsAllowed ? '✅ Yes' : '❌ No'}</span>
          </div>
          {property.parking && (
            <div className="detail-item">
              <span className="label">Parking</span>
              <span className="value">🚗 {property.parking}</span>
            </div>
          )}
        </div>
      </div>

      {/* Financial details */}
      <div className="detail-section">
        <h3>Financial Details</h3>
        <div className="details-grid">
          <div className="detail-item">
            <span className="label">
              {property.propertyType === 'rental' ? 'Monthly Rent' : 'Sale Price'}
            </span>
            <span className="value price-value">{formatPrice(property.price)}</span>
          </div>
          {property.vaadAmount != null && (
            <div className="detail-item">
              <span className="label">Vaad Bayit (monthly)</span>
              <span className="value">₪{property.vaadAmount.toLocaleString()}</span>
            </div>
          )}
          {property.cityTaxes != null && (
            <div className="detail-item">
              <span className="label">City Taxes (Arnona/mo)</span>
              <span className="value">₪{property.cityTaxes.toLocaleString()}</span>
            </div>
          )}
          {property.totalMonthlyPayment != null && (
            <div className="detail-item highlight">
              <span className="label">Total Monthly Payment</span>
              <span className="value">₪{property.totalMonthlyPayment.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="detail-section">
        <h3>Availability</h3>
        <div className="details-grid">
          <div className="detail-item">
            <span className="label">Move-in Date</span>
            <span className="value">📅 {formatDate(property.moveInDate)}</span>
          </div>
          <div className="detail-item">
            <span className="label">Entry Date</span>
            <span className="value">🗓 {formatDate(property.entryDate)}</span>
          </div>
        </div>
      </div>

      {/* Agent info */}
      {property.agent && (
        <div className="detail-section agent-section">
          <h3>Contact Agent</h3>
          <p>👤 <strong>{property.agent.name}</strong></p>
          {property.agent.phone && <p>📞 {property.agent.phone}</p>}
          {property.agent.email && <p>✉️ {property.agent.email}</p>}
        </div>
      )}
    </div>
  );
};

export default PropertyDetail;
