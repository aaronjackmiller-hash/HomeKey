import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { getProperties } from '../services/api';

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const history = useHistory();

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      setError('');
      try {
        const params = filter !== 'all' ? { type: filter } : {};
        const result = await getProperties(params);
        setProperties(result.data || []);
      } catch (err) {
        if (err.response && err.response.status === 503) {
          setError('Database is unavailable. Please check your MongoDB connection configuration.');
        } else {
          setError('Failed to load properties. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [filter]);

  if (loading) return <p>Loading properties…</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <div className='tabs'>
        <button onClick={() => setFilter('all')}>All</button>
        <button onClick={() => setFilter('rental')}>Rental</button>
        <button onClick={() => setFilter('sale')}>For Sale</button>
      </div>
      <div className='container'>
        {properties.length === 0 && <p>No properties found.</p>}
        {properties.map((property) => (
          <div
            key={property._id}
            className='property-card'
            onClick={() => history.push(`/properties/${property._id}`)}
            style={{ cursor: 'pointer' }}
          >
            {property.images && property.images[0] && (
              <img src={property.images[0]} alt={property.title} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '4px' }} />
            )}
            <h3>{property.title}</h3>
            <p>{property.address?.city}{property.address?.city && property.address?.state ? ', ' : ''}{property.address?.state}</p>
            <p><strong>${property.price?.toLocaleString()}</strong> &bull; {property.type === 'rental' ? 'Rental' : 'For Sale'}</p>
            <p>{property.bedrooms} bed &bull; {property.bathrooms} bath &bull; {property.size} sqm</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertyList;
