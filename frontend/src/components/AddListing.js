import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProperty } from '../services/api';

const initialState = {
  address: '',
  city: '',
  price: '',
  propertyType: 'rental',
  bedrooms: '',
  bathrooms: '',
  size: '',
  floorNumber: '',
  elevator: false,
  mamad: false,
  propertyCondition: 'good',
  petsAllowed: false,
  parking: '',
  totalMonthlyPayment: '',
  vaadAmount: '',
  cityTaxes: '',
  moveInDate: '',
  entryDate: '',
  description: '',
  imageUrl: '',
};

const AddListing = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      ...form,
      price: Number(form.price) || 0,
      bedrooms: Number(form.bedrooms) || 0,
      bathrooms: Number(form.bathrooms) || 0,
      size: form.size ? Number(form.size) : undefined,
      floorNumber: form.floorNumber !== '' ? Number(form.floorNumber) : undefined,
      totalMonthlyPayment: form.totalMonthlyPayment ? Number(form.totalMonthlyPayment) : undefined,
      vaadAmount: form.vaadAmount ? Number(form.vaadAmount) : undefined,
      cityTaxes: form.cityTaxes ? Number(form.cityTaxes) : undefined,
      moveInDate: form.moveInDate || undefined,
      entryDate: form.entryDate || undefined,
      images: form.imageUrl ? [form.imageUrl] : [],
    };
    delete payload.imageUrl;

    try {
      await createProperty(payload);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create listing. Is the backend running?');
      setSubmitting(false);
    }
  };

  return (
    <div className="add-listing-page">
      <h2>Add New Property Listing</h2>
      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit} className="listing-form">

        {/* === BASIC INFO === */}
        <fieldset className="form-section">
          <legend>📍 Basic Information</legend>
          <div className="form-row">
            <div className="form-group">
              <label>Address *</label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="e.g. Dizengoff Street 42"
                required
              />
            </div>
            <div className="form-group">
              <label>City *</label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="e.g. Tel Aviv"
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Property Type *</label>
              <select name="propertyType" value={form.propertyType} onChange={handleChange} required>
                <option value="rental">Rental</option>
                <option value="for-sale">For Sale</option>
              </select>
            </div>
            <div className="form-group">
              <label>{form.propertyType === 'rental' ? 'Monthly Rent (₪) *' : 'Sale Price (₪) *'}</label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder={form.propertyType === 'rental' ? '8500' : '2500000'}
                min="0"
                required
              />
            </div>
          </div>
        </fieldset>

        {/* === ROOMS & SIZE === */}
        <fieldset className="form-section">
          <legend>🏠 Rooms &amp; Size</legend>
          <div className="form-row">
            <div className="form-group">
              <label>Bedrooms *</label>
              <input
                type="number"
                name="bedrooms"
                value={form.bedrooms}
                onChange={handleChange}
                placeholder="3"
                min="0"
                required
              />
            </div>
            <div className="form-group">
              <label>Bathrooms *</label>
              <input
                type="number"
                name="bathrooms"
                value={form.bathrooms}
                onChange={handleChange}
                placeholder="2"
                min="0"
                required
              />
            </div>
            <div className="form-group">
              <label>Size (m²)</label>
              <input
                type="number"
                name="size"
                value={form.size}
                onChange={handleChange}
                placeholder="95"
                min="0"
              />
            </div>
          </div>
        </fieldset>

        {/* === BUILDING DETAILS === */}
        <fieldset className="form-section">
          <legend>🏢 Building Details</legend>
          <div className="form-row">
            <div className="form-group">
              <label>Floor Number</label>
              <input
                type="number"
                name="floorNumber"
                value={form.floorNumber}
                onChange={handleChange}
                placeholder="4"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Property Condition *</label>
              <select name="propertyCondition" value={form.propertyCondition} onChange={handleChange}>
                <option value="new">New</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="needs renovation">Needs Renovation</option>
              </select>
            </div>
            <div className="form-group">
              <label>Parking Details</label>
              <input
                type="text"
                name="parking"
                value={form.parking}
                onChange={handleChange}
                placeholder="e.g. 1 underground spot included"
              />
            </div>
          </div>
          <div className="form-row toggles">
            <label className="toggle-label">
              <input
                type="checkbox"
                name="elevator"
                checked={form.elevator}
                onChange={handleChange}
              />
              <span>🛗 Elevator</span>
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                name="mamad"
                checked={form.mamad}
                onChange={handleChange}
              />
              <span>🛡 Mamad (Safe Room)</span>
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                name="petsAllowed"
                checked={form.petsAllowed}
                onChange={handleChange}
              />
              <span>🐾 Pets Allowed</span>
            </label>
          </div>
        </fieldset>

        {/* === FINANCIAL === */}
        <fieldset className="form-section">
          <legend>💰 Financial Details</legend>
          <div className="form-row">
            <div className="form-group">
              <label>Total Monthly Payment (₪)</label>
              <input
                type="number"
                name="totalMonthlyPayment"
                value={form.totalMonthlyPayment}
                onChange={handleChange}
                placeholder="9650"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Vaad Bayit / month (₪)</label>
              <input
                type="number"
                name="vaadAmount"
                value={form.vaadAmount}
                onChange={handleChange}
                placeholder="650"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>City Taxes / Arnona (₪)</label>
              <input
                type="number"
                name="cityTaxes"
                value={form.cityTaxes}
                onChange={handleChange}
                placeholder="500"
                min="0"
              />
            </div>
          </div>
        </fieldset>

        {/* === DATES === */}
        <fieldset className="form-section">
          <legend>📅 Availability</legend>
          <div className="form-row">
            <div className="form-group">
              <label>Move-in Date</label>
              <input
                type="date"
                name="moveInDate"
                value={form.moveInDate}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Entry Date</label>
              <input
                type="date"
                name="entryDate"
                value={form.entryDate}
                onChange={handleChange}
              />
            </div>
          </div>
        </fieldset>

        {/* === DESCRIPTION & MEDIA === */}
        <fieldset className="form-section">
          <legend>✍️ Description &amp; Media</legend>
          <div className="form-group full-width">
            <label>Detailed Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={6}
              placeholder="Describe the property with rich, colorful detail — highlight unique features, location advantages, lifestyle benefits..."
            />
          </div>
          <div className="form-group full-width">
            <label>Image URL</label>
            <input
              type="url"
              name="imageUrl"
              value={form.imageUrl}
              onChange={handleChange}
              placeholder="https://example.com/property-image.jpg"
            />
            {form.imageUrl && (
              <img
                src={form.imageUrl}
                alt="Preview"
                className="image-preview"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={() => navigate('/')}>
            Cancel
          </button>
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? 'Saving...' : '✅ Save Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddListing;
