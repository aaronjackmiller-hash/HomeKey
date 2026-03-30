import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { createProperty } from '../services/api';

const AddListing = () => {
  const history = useHistory();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
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
    description: '',
    imageUrl: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      ...form,
      price: Number(form.price),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      size: form.size ? Number(form.size) : undefined,
      floorNumber: form.floorNumber !== '' ? Number(form.floorNumber) : undefined,
      totalMonthlyPayment: form.totalMonthlyPayment ? Number(form.totalMonthlyPayment) : undefined,
      vaadAmount: form.vaadAmount ? Number(form.vaadAmount) : undefined,
      cityTaxes: form.cityTaxes ? Number(form.cityTaxes) : undefined,
      moveInDate: form.moveInDate || undefined,
      images: form.imageUrl ? [form.imageUrl] : []
    };
    delete payload.imageUrl;

    try {
      await createProperty(payload);
      history.push('/');
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="add-listing">
      <h2>Add New Property Listing</h2>
      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit} className="listing-form">

        {/* Basic Information */}
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
                placeholder="Street name and number"
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
              <label>Price (₪) *</label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="Price in NIS"
                min="0"
                required
              />
            </div>
          </div>
        </fieldset>

        {/* Property Specs */}
        <fieldset className="form-section">
          <legend>🏠 Property Specifications</legend>
          <div className="form-row">
            <div className="form-group">
              <label>Bedrooms *</label>
              <input
                type="number"
                name="bedrooms"
                value={form.bedrooms}
                onChange={handleChange}
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
                min="0"
                required
              />
            </div>
            <div className="form-group">
              <label>Size (sq. meters)</label>
              <input
                type="number"
                name="size"
                value={form.size}
                onChange={handleChange}
                placeholder="e.g. 90"
                min="0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Floor Number</label>
              <input
                type="number"
                name="floorNumber"
                value={form.floorNumber}
                onChange={handleChange}
                placeholder="0 = Ground floor"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Property Condition</label>
              <select name="propertyCondition" value={form.propertyCondition} onChange={handleChange}>
                <option value="new">New</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="needs renovation">Needs Renovation</option>
              </select>
            </div>
          </div>

          <div className="form-row toggles-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                name="elevator"
                checked={form.elevator}
                onChange={handleChange}
              />
              <span className="toggle-text">🛗 Elevator</span>
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                name="mamad"
                checked={form.mamad}
                onChange={handleChange}
              />
              <span className="toggle-text">🛡️ Mamad (Safe Room)</span>
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                name="petsAllowed"
                checked={form.petsAllowed}
                onChange={handleChange}
              />
              <span className="toggle-text">🐾 Pets Allowed</span>
            </label>
          </div>

          <div className="form-group">
            <label>Parking Details</label>
            <input
              type="text"
              name="parking"
              value={form.parking}
              onChange={handleChange}
              placeholder="e.g. Underground parking included, street parking only"
            />
          </div>
        </fieldset>

        {/* Financial Details */}
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
                placeholder="Including all fees"
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
                placeholder="Building committee fee"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>City Taxes / Arnona (₪/month)</label>
              <input
                type="number"
                name="cityTaxes"
                value={form.cityTaxes}
                onChange={handleChange}
                placeholder="Monthly arnona"
                min="0"
              />
            </div>
          </div>
        </fieldset>

        {/* Additional Info */}
        <fieldset className="form-section">
          <legend>📅 Additional Information</legend>
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
              <label>Image URL</label>
              <input
                type="url"
                name="imageUrl"
                value={form.imageUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label>Detailed Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={6}
              placeholder="Describe the property in detail — highlight unique features, neighborhood, views, special amenities..."
            />
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="button" onClick={() => history.push('/')} className="btn btn-outline">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? 'Saving...' : 'Add Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddListing;
