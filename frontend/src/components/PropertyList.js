import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProperties } from '../utils/api';
import './PropertyList.css';

const PLACEHOLDER = 'https://via.placeholder.com/400x250?text=No+Image';

function PropertyList() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getProperties()
      .then(setProperties)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="status-msg">Loading properties…</p>;
  if (error) return <p className="status-msg error">Error: {error}</p>;

  const filtered =
    filter === 'all' ? properties : properties.filter((p) => p.type === filter);

  return (
    <div className="property-list-page">
      <div className="filter-bar">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={filter === 'for-sale' ? 'active' : ''}
          onClick={() => setFilter('for-sale')}
        >
          For Sale
        </button>
        <button
          className={filter === 'rental' ? 'active' : ''}
          onClick={() => setFilter('rental')}
        >
          Rentals
        </button>
      </div>

      {filtered.length === 0 && (
        <p className="status-msg">No properties found.</p>
      )}

      <div className="property-grid">
        {filtered.map((p) => (
          <Link to={`/properties/${p._id}`} key={p._id} className="property-card">
            <img
              src={p.images && p.images[0] ? p.images[0] : PLACEHOLDER}
              alt={p.address}
            />
            <div className="card-body">
              <span className={`badge ${p.type}`}>
                {p.type === 'rental' ? 'Rental' : 'For Sale'}
              </span>
              <h3>{p.address}</h3>
              <p className="price">
                {p.type === 'rental'
                  ? `$${p.price.toLocaleString()}/mo`
                  : `$${p.price.toLocaleString()}`}
              </p>
              <p className="meta">
                {p.bedrooms} bed · {p.bathrooms} bath
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default PropertyList;
