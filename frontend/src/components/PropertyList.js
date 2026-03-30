import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProperties } from '../services/api';

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getProperties()
      .then((res) => setProperties(res.data))
      .catch(() => setError('Failed to load properties. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === 'all' ? properties : properties.filter((p) => p.propertyType === filter);

  if (loading) return <div className="status-msg">Loading properties...</div>;
  if (error) return <div className="status-msg error">{error}</div>;

  return (
    <div className="property-list-page">
      <div className="list-header">
        <h2>Available Properties</h2>
        <div className="filter-tabs">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All ({properties.length})
          </button>
          <button
            className={filter === 'rental' ? 'active' : ''}
            onClick={() => setFilter('rental')}
          >
            Rentals ({properties.filter((p) => p.propertyType === 'rental').length})
          </button>
          <button
            className={filter === 'for-sale' ? 'active' : ''}
            onClick={() => setFilter('for-sale')}
          >
            For Sale ({properties.filter((p) => p.propertyType === 'for-sale').length})
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="status-msg">No properties found. Try adding one!</p>
      )}

      <div className="property-grid">
        {filtered.map((property) => (
          <div key={property._id} className="property-card">
            <div className="card-image">
              {property.images && property.images[0] ? (
                <img src={property.images[0]} alt={property.address} />
              ) : (
                <div className="no-image">🏠</div>
              )}
              <span className={`badge ${property.propertyType}`}>
                {property.propertyType === 'rental' ? 'For Rent' : 'For Sale'}
              </span>
            </div>
            <div className="card-body">
              <h3>{property.address}</h3>
              <p className="city">📍 {property.city}</p>
              <div className="price">
                {property.propertyType === 'rental'
                  ? `₪${property.price.toLocaleString()}/mo`
                  : `₪${property.price.toLocaleString()}`}
              </div>
              <div className="card-specs">
                <span>🛏 {property.bedrooms} bd</span>
                <span>🚿 {property.bathrooms} ba</span>
                {property.size && <span>📐 {property.size} m²</span>}
                {property.mamad && <span>🛡 Mamad</span>}
                {property.elevator && <span>🛗 Elevator</span>}
              </div>
              <div className="card-condition">
                Condition: <strong>{property.propertyCondition}</strong>
              </div>
              <Link to={`/properties/${property._id}`} className="btn-detail">
                View Details →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertyList;
