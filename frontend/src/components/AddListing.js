import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { createProperty } from '../utils/api';
import './AddListing.css';

const INITIAL = {
  address: '',
  price: '',
  bedrooms: '',
  bathrooms: '',
  type: 'for-sale',
  description: '',
  imageUrl: '',
};

function AddListing() {
  const history = useHistory();
  const [form, setForm] = useState(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        address: form.address,
        price: Number(form.price),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        type: form.type,
        description: form.description,
        images: form.imageUrl ? [form.imageUrl] : [],
      };
      await createProperty(payload);
      history.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="add-listing">
      <h2>Add New Listing</h2>
      {error && <p className="form-error">{error}</p>}
      <form onSubmit={handleSubmit} className="listing-form">
        <label>
          Address *
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            required
            placeholder="123 Main St, City, ST 00000"
          />
        </label>

        <label>
          Price *
          <input
            name="price"
            type="number"
            min="0"
            value={form.price}
            onChange={handleChange}
            required
            placeholder="e.g. 350000 or 1800 (monthly)"
          />
        </label>

        <div className="form-row">
          <label>
            Bedrooms *
            <input
              name="bedrooms"
              type="number"
              min="0"
              value={form.bedrooms}
              onChange={handleChange}
              required
              placeholder="e.g. 3"
            />
          </label>
          <label>
            Bathrooms *
            <input
              name="bathrooms"
              type="number"
              min="0"
              step="0.5"
              value={form.bathrooms}
              onChange={handleChange}
              required
              placeholder="e.g. 2"
            />
          </label>
        </div>

        <label>
          Listing Type *
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="for-sale">For Sale</option>
            <option value="rental">Rental</option>
          </select>
        </label>

        <label>
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            placeholder="Describe the property…"
          />
        </label>

        <label>
          Image URL
          <input
            name="imageUrl"
            type="url"
            value={form.imageUrl}
            onChange={handleChange}
            placeholder="https://example.com/photo.jpg"
          />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Add Listing'}
        </button>
      </form>
    </div>
  );
}

export default AddListing;
