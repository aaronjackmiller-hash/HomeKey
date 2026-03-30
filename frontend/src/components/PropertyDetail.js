import React, { useState, useEffect } from 'react';
import { getProperty } from '../utils/api';
import './PropertyDetail.css';

const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);

const PropertyDetail = ({ propertyId, onBack }) => {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getProperty(propertyId);
        setProperty(data);
      } catch (err) {
        setError('Failed to load property details.');
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [propertyId]);

  if (loading) return <div className="property-detail__status">Loading...</div>;
  if (error) return <div className="property-detail__status property-detail__status--error">{error}</div>;
  if (!property) return null;

  const { address, price, bedrooms, bathrooms, sqft, description, images, agent, status, propertyType, yearBuilt, garage } = property;
  const imgList = images && images.length > 0 ? images : ['https://via.placeholder.com/800x500?text=No+Image'];

  return (
    <div className="property-detail">
      <button className="property-detail__back" onClick={onBack}>← Back to listings</button>

      <div className="property-detail__gallery">
        <img src={imgList[activeImage]} alt={address.street} className="property-detail__main-image" />
        {imgList.length > 1 && (
          <div className="property-detail__thumbnails">
            {imgList.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`View ${i + 1}`}
                className={`property-detail__thumb ${i === activeImage ? 'property-detail__thumb--active' : ''}`}
                onClick={() => setActiveImage(i)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="property-detail__content">
        <div className="property-detail__header">
          <div>
            <h1 className="property-detail__price">{formatPrice(price)}</h1>
            <p className="property-detail__address">
              {address.street}, {address.city}, {address.state} {address.zip}
            </p>
          </div>
          <span className={`property-detail__badge property-detail__badge--${status}`}>{status}</span>
        </div>

        <div className="property-detail__stats">
          <div className="property-detail__stat">
            <span className="property-detail__stat-value">{bedrooms}</span>
            <span className="property-detail__stat-label">Bedrooms</span>
          </div>
          <div className="property-detail__stat">
            <span className="property-detail__stat-value">{bathrooms}</span>
            <span className="property-detail__stat-label">Bathrooms</span>
          </div>
          <div className="property-detail__stat">
            <span className="property-detail__stat-value">{sqft.toLocaleString()}</span>
            <span className="property-detail__stat-label">Sq Ft</span>
          </div>
          {garage > 0 && (
            <div className="property-detail__stat">
              <span className="property-detail__stat-value">{garage}</span>
              <span className="property-detail__stat-label">Garage</span>
            </div>
          )}
        </div>

        <div className="property-detail__meta">
          {propertyType && <span>Type: <strong>{propertyType}</strong></span>}
          {yearBuilt && <span>Built: <strong>{yearBuilt}</strong></span>}
        </div>

        {description && (
          <div className="property-detail__description">
            <h2>Description</h2>
            <p>{description}</p>
          </div>
        )}

        {agent && (
          <div className="property-detail__agent">
            <h2>Listed by</h2>
            <div className="property-detail__agent-info">
              {agent.photo && <img src={agent.photo} alt={agent.name} className="property-detail__agent-photo" />}
              <div>
                <p className="property-detail__agent-name">{agent.name}</p>
                {agent.agency && <p className="property-detail__agent-agency">{agent.agency}</p>}
                <p><a href={`mailto:${agent.email}`}>{agent.email}</a></p>
                <p>{agent.phone}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyDetail;
