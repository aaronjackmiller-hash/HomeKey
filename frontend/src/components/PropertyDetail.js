import React, { useState, useEffect } from 'react';
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
      .then((data) => {
        setProperty(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="loading">Loading property...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!property) return <div className="error">Property not found</div>;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Flexible';
    return new Date(dateStr).toLocaleDateString('he-IL', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const conditionLabels = {
    new: 'New',
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    'needs renovation': 'Needs Renovation'
  };

  return (
    <div className="property-detail">
      <div className="detail-nav">
        <Link to="/" className="back-link">← Back to Listings</Link>
        <span className={`badge badge-${property.propertyType}`}>
          {property.propertyType === 'rental' ? 'For Rent' : 'For Sale'}
        </span>
      </div>

      {/* Image Gallery */}
      <div className="image-gallery">
        <div className="main-image">
          <img
            src={property.images && property.images[activeImage]
              ? property.images[activeImage]
              : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800'}
            alt={property.address}
          />
        </div>
        {property.images && property.images.length > 1 && (
          <div className="thumbnail-row">
            {property.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`View ${i + 1}`}
                className={i === activeImage ? 'thumb-active' : ''}
                onClick={() => setActiveImage(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="detail-header">
        <div>
          <h1 className="detail-price">
            ₪{property.price.toLocaleString()}
            {property.propertyType === 'rental' && <span>/month</span>}
          </h1>
          <h2 className="detail-address">{property.address}, {property.city}</h2>
        </div>
      </div>

      {/* Quick Specs */}
      <div className="specs-bar">
        <div className="spec-item">
          <span className="spec-icon">🛏</span>
          <span>{property.bedrooms} Bedrooms</span>
        </div>
        <div className="spec-item">
          <span className="spec-icon">🚿</span>
          <span>{property.bathrooms} Bathrooms</span>
        </div>
        {property.size && (
          <div className="spec-item">
            <span className="spec-icon">📐</span>
            <span>{property.size} m²</span>
          </div>
        )}
        {property.floorNumber !== undefined && property.floorNumber !== null && (
          <div className="spec-item">
            <span className="spec-icon">🏢</span>
            <span>Floor {property.floorNumber === 0 ? 'Ground' : property.floorNumber}</span>
          </div>
        )}
      </div>

      <div className="detail-body">
        {/* Description */}
        {property.description && (
          <div className="detail-section">
            <h3>About This Property</h3>
            <p className="description-text">{property.description}</p>
          </div>
        )}

        {/* Property Details */}
        <div className="detail-section">
          <h3>Property Details</h3>
          <div className="details-grid">
            <div className="detail-row">
              <span className="detail-label">Condition</span>
              <span className="detail-value">{conditionLabels[property.propertyCondition] || property.propertyCondition}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Elevator</span>
              <span className="detail-value">{property.elevator ? '✅ Yes' : '❌ No'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Mamad (Safe Room)</span>
              <span className="detail-value">{property.mamad ? '✅ Yes' : '❌ No'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Pets Allowed</span>
              <span className="detail-value">{property.petsAllowed ? '✅ Yes' : '❌ No'}</span>
            </div>
            {property.parking && (
              <div className="detail-row">
                <span className="detail-label">Parking</span>
                <span className="detail-value">{property.parking}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Move-in Date</span>
              <span className="detail-value">{formatDate(property.moveInDate)}</span>
            </div>
          </div>
        </div>

        {/* Financial Details */}
        <div className="detail-section">
          <h3>Financial Details</h3>
          <div className="details-grid">
            <div className="detail-row">
              <span className="detail-label">
                {property.propertyType === 'rental' ? 'Monthly Rent' : 'Sale Price'}
              </span>
              <span className="detail-value highlight">₪{property.price.toLocaleString()}</span>
            </div>
            {property.totalMonthlyPayment && (
              <div className="detail-row">
                <span className="detail-label">Total Monthly Payment</span>
                <span className="detail-value">₪{property.totalMonthlyPayment.toLocaleString()}</span>
              </div>
            )}
            {property.vaadAmount > 0 && (
              <div className="detail-row">
                <span className="detail-label">Vaad Bayit (monthly)</span>
                <span className="detail-value">₪{property.vaadAmount.toLocaleString()}</span>
              </div>
            )}
            {property.cityTaxes && (
              <div className="detail-row">
                <span className="detail-label">Arnona / City Taxes (monthly)</span>
                <span className="detail-value">₪{property.cityTaxes.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Agent Info */}
        {property.agent && (
          <div className="detail-section">
            <h3>Contact Agent</h3>
            <div className="agent-card">
              <div className="agent-avatar">👤</div>
              <div>
                <strong>{property.agent.name}</strong>
                <p>{property.agent.email}</p>
                <p>{property.agent.phone}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyDetail;
