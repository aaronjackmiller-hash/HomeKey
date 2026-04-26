import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPropertyEngagement } from '../services/api';

const formatDateTime = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
};

const PropertyEngagement = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [engagement, setEngagement] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getPropertyEngagement(id);
        setEngagement(result.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load engagement data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <p className="status-message">Loading engagement dashboard...</p>;
  if (error) return <p className="status-message status-message-error">{error}</p>;
  if (!engagement) return null;

  return (
    <div style={{ maxWidth: '900px', margin: '20px auto', padding: '0 20px' }}>
      <h2>Engagement Dashboard</h2>
      <p><strong>Listing:</strong> {engagement.title}</p>
      <p>
        <Link to={`/properties/${id}`}>Back to property</Link>
      </p>

      <section style={{ marginBottom: '20px' }}>
        <h3>Prospective buyer/renter inquiries ({engagement.inquiries?.length || 0})</h3>
        {(engagement.inquiries || []).length === 0 && <p>No inquiries yet.</p>}
        {(engagement.inquiries || []).map((inquiry, index) => (
          <div key={`inq-${index}`} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}>
            <p><strong>{inquiry.name}</strong> ({inquiry.preferredMethod})</p>
            {inquiry.email && <p>Email: {inquiry.email}</p>}
            {inquiry.phone && <p>Phone: {inquiry.phone}</p>}
            <p>{inquiry.message}</p>
            <p style={{ color: '#666' }}>Submitted: {formatDateTime(inquiry.createdAt)}</p>
          </div>
        ))}
      </section>

      <section>
        <h3>Showing attendees</h3>
        {(engagement.showings || []).length === 0 && <p>No showing slots defined.</p>}
        {(engagement.showings || []).map((showing) => (
          <div key={`show-${showing._id}`} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}>
            <p><strong>{formatDateTime(showing.startsAt)} - {formatDateTime(showing.endsAt)}</strong></p>
            <p>Attendees: {(showing.attendees || []).length} / {showing.attendeeLimit || 20}</p>
            {showing.notes && <p>{showing.notes}</p>}
            {(showing.attendees || []).length === 0 && <p>No attendees yet.</p>}
            {(showing.attendees || []).map((attendee, index) => (
              <div key={`att-${showing._id}-${index}`} style={{ padding: '6px 0 6px 10px' }}>
                <p><strong>{attendee.name}</strong></p>
                {attendee.email && <p>Email: {attendee.email}</p>}
                {attendee.phone && <p>Phone: {attendee.phone}</p>}
                {attendee.message && <p>Message: {attendee.message}</p>}
                <p style={{ color: '#666' }}>Registered: {formatDateTime(attendee.createdAt)}</p>
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
};

export default PropertyEngagement;
