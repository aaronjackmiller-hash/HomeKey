import React, { useState, useEffect } from 'react';
import PropertyCard from './PropertyCard';
import SearchBar from './SearchBar';
import { getProperties } from '../utils/api';
import './PropertyList.css';

const PropertyList = ({ onSelectProperty }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getProperties({ page, ...filters });
        setProperties(data.properties);
        setTotalPages(data.totalPages);
      } catch (err) {
        setError('Failed to load properties.');
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [page, filters]);

  const handleSearch = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  if (loading) return <div className="property-list__status">Loading properties...</div>;
  if (error) return <div className="property-list__status property-list__status--error">{error}</div>;

  return (
    <div className="property-list">
      <SearchBar onSearch={handleSearch} />
      {properties.length === 0 ? (
        <div className="property-list__status">No properties found.</div>
      ) : (
        <div className="property-list__grid">
          {properties.map((p) => (
            <PropertyCard key={p._id} property={p} onClick={onSelectProperty} />
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <div className="property-list__pagination">
          <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PropertyList;
