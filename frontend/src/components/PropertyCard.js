import React from 'react';
import './PropertyCard.css';

const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);

const PropertyCard = ({ property, onClick }) => {
  const { address, price, bedrooms, bathrooms, sqft, images, status } = property;
  const imgSrc = images && images.length > 0 ? images[0] : 'https://via.placeholder.com/400x250?text=No+Image';

  return (
    <div className="property-card" onClick={() => onClick && onClick(property)}>
      <div className="property-card__image-wrapper">
        <img src={imgSrc} alt={address.street} className="property-card__image" />
        <span className={`property-card__badge property-card__badge--${status}`}>{status}</span>
      </div>
      <div className="property-card__body">
        <p className="property-card__price">{formatPrice(price)}</p>
        <p className="property-card__address">
          {address.street}, {address.city}, {address.state} {address.zip}
        </p>
        <div className="property-card__details">
          <span>{bedrooms} bd</span>
          <span className="property-card__dot">·</span>
          <span>{bathrooms} ba</span>
          <span className="property-card__dot">·</span>
          <span>{sqft ? sqft.toLocaleString() : 'N/A'} sqft</span>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
