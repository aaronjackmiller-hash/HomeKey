import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProperties } from '../services/api';

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getProperties()
      .then((data) => {
        setProperties(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading">Loading properties...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="property-list">
      <div className="list-header">
        <h2>Available Properties ({properties.length})</h2>
        <Link to="/add" className="btn btn-primary">+ Add Listing</Link>
      </div>
      <div className="property-grid">
        {properties.map((property) => (
          <div key={property._id} className="property-card">
            <div className="card-image">
              <img
                src={property.images && property.images[0]
                  ? property.images[0]
                  : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400'}
                alt={property.address}
              />
              <span className={`badge badge-${property.propertyType}`}>
                {property.propertyType === 'rental' ? 'For Rent' : 'For Sale'}
              </span>
            </div>
            <div className="card-body">
              <h3 className="card-price">
                ₪{property.price.toLocaleString()}
                {property.propertyType === 'rental' && <span>/mo</span>}
              </h3>
              <p className="card-address">{property.address}, {property.city}</p>
              <div className="card-specs">
                <span>🛏 {property.bedrooms} bd</span>
                <span>🚿 {property.bathrooms} ba</span>
                {property.size && <span>📐 {property.size} m²</span>}
              </div>
              <div className="card-tags">
                {property.elevator && <span className="tag">Elevator</span>}
                {property.mamad && <span className="tag">Mamad</span>}
                {property.petsAllowed && <span className="tag">Pets OK</span>}
              </div>
              <Link to={`/properties/${property._id}`} className="btn btn-outline">
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
      {properties.length === 0 && (
        <div className="empty-state">
          <p>No properties found. <Link to="/add">Add the first listing!</Link></p>
        </div>
      )}
    </div>
  );
};

export default PropertyList;
