/**
 * RoommateWizard.js
 * path: frontend/src/components/RoommateWizard.js
 *
 * Step 1 — Your Apartment (address, rent, utilities, bedrooms, sqm, date, lease, description)
 * Step 2 — Photos         (up to 3 apartment/common area photos)
 * Step 3 — Preferences    (gender, smoking, pets, kosher, vibe)
 * Step 4 — Contact        (phone, email — collected last, right before preview)
 * Step 5 — Preview        (full card preview → Go Live!)
 *
 * Contact info moved to Step 4 (just before publish) so users commit to the
 * process first before being asked for personal details.
 */

import React, { useState, useCallback, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { createRoommateListing, geocodeAddress } from '../services/api';
import ISRAEL_LOCATIONS from '../israelLocations';
import './RoommateWizard.css';

// ── Cloudinary config ───────────────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = 'dxz5neie0';
const CLOUDINARY_UPLOAD_PRESET = 'txkn4ah1';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const uploadPhotoToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const response = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: formData });
  if (!response.ok) throw new Error(`Photo upload failed (${response.status})`);
  const result = await response.json();
  return result.secure_url || null;
};

const uploadPhotosToCloudinary = async (files = []) => {
  if (!files.length) return { urls: [], failedCount: 0 };
  const results = await Promise.allSettled(files.map((file) => uploadPhotoToCloudinary(file)));
  const urls = [];
  let failedCount = 0;
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      urls.push(result.value);
    } else {
      failedCount += 1;
      console.error(`[RoommateWizard] Photo ${index + 1} failed:`, result.status === 'rejected' ? result.reason : 'No URL');
    }
  });
  return { urls, failedCount };
};

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;

const GENDER_OPTIONS = [
  { value: 'no-preference', label: 'No preference' },
  { value: 'men', label: 'Men only' },
  { value: 'women', label: 'Women only' },
];

const SMOKING_OPTIONS = [
  { value: 'not-allowed', label: 'Not allowed' },
  { value: 'outside-only', label: 'Outside only' },
  { value: 'allowed', label: 'Allowed' },
];

const PETS_OPTIONS = [
  { value: 'not-allowed', label: 'Not allowed' },
  { value: 'allowed', label: 'Allowed' },
  { value: 'have-pets', label: 'I have pets' },
];

const KOSHER_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
  { value: 'open-to-it', label: 'Open to it' },
];

const LEASE_OPTIONS = [
  { value: '1', label: '1 month' },
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '12', label: '12 months' },
  { value: '24', label: '24 months' },
];

// ── Amenity icons — emoji, colorful, 3-column horizontal layout ──────────
const AMENITY_OPTIONS = [
  { value: 'mamad',                label: 'Mamad',        icon: '🛡️' },
  { value: 'elevator',             label: 'Elevator',     icon: '🛗' },
  { value: 'parking',              label: 'Parking',      icon: '🚗' },
  { value: 'pets',                 label: 'Pets OK',      icon: '🐾' },
  { value: 'disabled-access',      label: 'Accessible',   icon: '♿' },
  { value: 'renovated',            label: 'Renovated',    icon: '🔨' },
  { value: 'furnished',            label: 'Furnished',    icon: '🛋️' },
  { value: 'oven',                 label: 'Oven',         icon: '🍳' },
  { value: 'balcony',              label: 'Balcony',      icon: '🌇' },
  { value: 'stovetop',             label: 'Stovetop',     icon: '🔥' },
  { value: 'in-unit-washer-dryer', label: 'Washer/Dryer', icon: '🌀' },
  { value: 'dishwasher',           label: 'Dishwasher',   icon: '🍽️' },
];


const UTILITY_ITEMS = [
  { key: 'utilityElectricity', label: 'Electricity' },
  { key: 'utilityWater', label: 'Water' },
  { key: 'utilityInternet', label: 'Internet' },
  { key: 'utilityVaad', label: 'VAAD (building fee)' },
];

const sumUtilities = (data) =>
  UTILITY_ITEMS.reduce((sum, item) => sum + (Number(data[item.key]) || 0), 0);

const MIN_DESCRIPTION_LENGTH = 15;

const normalizeCityName = (value) =>
  String(value || '').trim().toLowerCase().replace(/[-–—].*$/, '').trim();

const findCityEntry = (cityInput) => {
  const normalizedInput = normalizeCityName(cityInput);
  if (!normalizedInput) return null;
  return ISRAEL_LOCATIONS.find((entry) => {
    const normalizedEntryCity = normalizeCityName(entry.city.en);
    return normalizedEntryCity === normalizedInput
      || normalizedInput.startsWith(normalizedEntryCity)
      || normalizedEntryCity.startsWith(normalizedInput);
  }) || null;
};

const CONTACT_METHODS = [
  { value: 'phone', label: 'Phone call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
];

const COUNTRY_CODES = [
  { code: '+972', flag: '🇮🇱', label: 'IL', placeholder: '050 000 0000' },
  { code: '+1',   flag: '🇺🇸', label: 'US', placeholder: '212 000 0000' },
  { code: '+44',  flag: '🇬🇧', label: 'UK', placeholder: '7700 000000' },
  { code: '+27',  flag: '🇿🇦', label: 'ZA', placeholder: '82 000 0000' },
  { code: '+61',  flag: '🇦🇺', label: 'AU', placeholder: '400 000 000' },
  { code: '+1',   flag: '🇨🇦', label: 'CA', placeholder: '416 000 0000' },
  { code: '+33',  flag: '🇫🇷', label: 'FR', placeholder: '6 00 00 00 00' },
  { code: '+49',  flag: '🇩🇪', label: 'DE', placeholder: '151 00000000' },
  { code: '+55',  flag: '🇧🇷', label: 'BR', placeholder: '11 90000 0000' },
  { code: '+7',   flag: '🇷🇺', label: 'RU', placeholder: '900 000 0000' },
];

// ── Initial state ─────────────────────────────────────────────────────────────

const createInitialData = () => ({
  // Step 1 — Apartment
  city: '',
  street: '',
  streetNumber: '',
  neighborhood: '',
  lat: null,
  lng: null,
  rentShare: '',
  utilityElectricity: '',
  utilityWater: '',
  utilityInternet: '',
  utilityVaad: '',
  totalBedrooms: '1',
  totalBathrooms: '1',
  sizeSqm: '',
  dateAvailable: '',
  minLeaseMonths: '6',
  description: '',
  amenities: [],

  // Step 2 — Photos
  photoFiles: [],
  photoPreviewUrls: [],

  // Step 3 — Preferences
  genderPreference: 'no-preference',
  smoking: 'not-allowed',
  pets: 'not-allowed',
  kosherKitchen: 'no',
  vibe: '',

  // Step 4 — Contact (collected last)
  phone: '',
  countryCode: '+972',
  countryLabel: 'IL',
  email: '',
  preferredMethod: 'whatsapp',
});

// ── Shared sub-components ─────────────────────────────────────────────────────

const ProgressBar = ({ step }) => (
  <div className="rw-progress-rail">
    <div className="rw-progress-fill" style={{ width: `${Math.round((step / TOTAL_STEPS) * 100)}%` }} />
  </div>
);

const StepHeader = ({ step, title }) => (
  <div className="rw-step-header">
    <h2 className="rw-step-title">{title}</h2>
    <span className="rw-step-counter">Step {step} of {TOTAL_STEPS}</span>
  </div>
);

const Field = ({ label, required, hint, error, children }) => (
  <div className={`rw-field ${error ? 'rw-field--error' : ''}`}>
    <label className="rw-label">
      {label}
      {required && <span className="rw-label-required" aria-hidden="true"> *</span>}
    </label>
    {hint && <p className="rw-hint">{hint}</p>}
    {children}
    {error && <p className="rw-field-error">{error}</p>}
  </div>
);

const ToggleGroup = ({ options, value, onChange }) => (
  <div className="rw-toggle-group" role="group">
    {options.map((opt) => (
      <button key={opt.value} type="button"
        className={`rw-toggle-btn ${value === opt.value ? 'is-active' : ''}`}
        onClick={() => onChange(opt.value)} aria-pressed={value === opt.value}>
        {opt.label}
      </button>
    ))}
  </div>
);

const WizardActions = ({ onBack, onNext, nextLabel = 'Continue', backLabel = 'Back', nextDisabled = false, isLoading = false, loadingLabel = 'Publishing...' }) => (
  <div className="rw-actions">
    {onBack && (
      <button type="button" className="rw-btn rw-btn--ghost" onClick={onBack}>{backLabel}</button>
    )}
    <button type="button" className="rw-btn rw-btn--primary" onClick={onNext} disabled={nextDisabled || isLoading}>
      {isLoading ? loadingLabel : nextLabel}
    </button>
  </div>
);

// ── Step 1: Apartment Details (moved from Step 2) ─────────────────────────────

const Step1Apartment = ({ data, onChange, onNext, onClose }) => {
  const [errors, setErrors] = useState({});
  const geocodeRequestIdRef = useRef(0);

  const validate = () => {
    const next = {};
    if (!data.city.trim()) next.city = 'City is required';
    if (!data.street.trim()) next.street = 'Street is required';
    if (!data.neighborhood.trim()) next.neighborhood = 'Please select or enter your neighborhood';
    if (!data.rentShare || isNaN(Number(data.rentShare)) || Number(data.rentShare) <= 0) {
      next.rentShare = 'Please enter a valid monthly rent';
    }
    if (!data.totalBedrooms || Number(data.totalBedrooms) < 1) {
      next.totalBedrooms = 'Please select the number of bedrooms';
    }
    if (!data.dateAvailable) next.dateAvailable = 'Please select an availability date';
    const trimmedDescription = data.description.trim();
    if (!trimmedDescription) {
      next.description = 'Please describe the apartment';
    } else if (trimmedDescription.length < MIN_DESCRIPTION_LENGTH) {
      next.description = `Please write at least ${MIN_DESCRIPTION_LENGTH} characters (${trimmedDescription.length}/${MIN_DESCRIPTION_LENGTH})`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleFieldChange = (field, value) => {
    onChange(field, value);
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  };

  const tryAutoFillCoordinates = async () => {
    const street = data.street.trim();
    const city = data.city.trim();
    if (!street || !city) return;
    const requestId = ++geocodeRequestIdRef.current;
    try {
      const result = await geocodeAddress({ street, streetNumber: data.streetNumber.trim(), city });
      if (requestId !== geocodeRequestIdRef.current) return;
      const geocoded = result?.data ?? result;
      if (typeof geocoded?.lat === 'number' && typeof geocoded?.lng === 'number') {
        onChange('lat', geocoded.lat);
        onChange('lng', geocoded.lng);
      }
    } catch (err) {
      console.error('[RoommateWizard] Geocode failed:', err);
    }
  };

  const handleCityChange = (value) => {
    handleFieldChange('city', value);
    onChange('neighborhood', '');
  };

  const cityEntry = findCityEntry(data.city);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="rw-step-card" style={{ background: '#e8f4f0', padding: 0, gap: 0, overflow: 'hidden' }}>

      {/* ── Teal decorative header ── */}
      <div style={{ background: '#2d6b5e', padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ flexShrink: 0 }}>
            <svg viewBox="0 0 72 72" width="60" height="60" focusable="false" aria-hidden="true">
              <rect x="4" y="28" width="64" height="36" rx="4" fill="#1f4f44"/>
              <polygon points="36,8 6,30 66,30" fill="#4a9b85"/>
              <rect x="14" y="36" width="14" height="14" rx="2" fill="#b8d8d0"/>
              <rect x="16" y="38" width="5" height="5" rx="1" fill="#2d6b5e"/>
              <rect x="23" y="38" width="5" height="5" rx="1" fill="#2d6b5e"/>
              <rect x="16" y="45" width="5" height="5" rx="1" fill="#2d6b5e"/>
              <rect x="23" y="45" width="5" height="5" rx="1" fill="#2d6b5e"/>
              <rect x="30" y="42" width="12" height="22" rx="2" fill="#4a9b85"/>
              <rect x="33" y="48" width="3" height="3" rx="1" fill="#1f4f44"/>
              <rect x="44" y="36" width="14" height="10" rx="2" fill="#b8d8d0"/>
              <rect x="46" y="38" width="10" height="6" rx="1" fill="#2d6b5e" opacity="0.6"/>
              <circle cx="58" cy="20" r="6" fill="#f0c040" opacity="0.8"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: '16px', margin: '0 0 4px' }}>
                Tell us about your apartment
              </p>
              <span style={{ color: '#a8d5c8', fontSize: '11px', whiteSpace: 'nowrap' }}>Step 1 of {TOTAL_STEPS}</span>
            </div>
            <p style={{ color: '#a8d5c8', fontSize: '12px', margin: 0, lineHeight: 1.4 }}>
              Help roommates find and contact you — we'll never share your details publicly
            </p>
          </div>
        </div>
        {/* Teal progress bar inside header */}
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '99px', marginTop: '14px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#fff', borderRadius: '99px', width: `${Math.round((1 / TOTAL_STEPS) * 100)}%`, transition: 'width 0.35s ease' }} />
        </div>
      </div>

      {/* ── Form sections — white cards on teal background ── */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Location */}
        <div style={{ background: '#fff', borderRadius: '10px', padding: '14px 16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#2d6b5e', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Location</p>
          <Field label="City" required error={errors.city}>
            <input type="text" className={`rw-input ${errors.city ? 'rw-input--error' : ''}`}
              placeholder="Tel Aviv-Yafo" value={data.city}
              onChange={(e) => handleCityChange(e.target.value)} autoFocus />
          </Field>
          <div className="rw-field-row" style={{ marginTop: '10px' }}>
            <Field label="Street" required error={errors.street}>
              <input type="text" className={`rw-input ${errors.street ? 'rw-input--error' : ''}`}
                placeholder="Rothschild Blvd" value={data.street}
                onChange={(e) => handleFieldChange('street', e.target.value)}
                onBlur={() => { if (!data.streetNumber.trim()) tryAutoFillCoordinates(); }} />
            </Field>
            <Field label="Number">
              <input type="text" className="rw-input rw-input--short" placeholder="42"
                value={data.streetNumber} onChange={(e) => onChange('streetNumber', e.target.value)}
                onBlur={tryAutoFillCoordinates} />
            </Field>
          </div>
          <div style={{ marginTop: '10px' }}>
            <Field label="Neighborhood" required error={errors.neighborhood}
              hint={cityEntry ? 'Select the neighborhood that best matches your address' : 'Type your neighborhood'}>
              {cityEntry ? (
                <select className={`rw-select ${errors.neighborhood ? 'rw-input--error' : ''}`}
                  value={data.neighborhood} onChange={(e) => handleFieldChange('neighborhood', e.target.value)}>
                  <option value="">Select a neighborhood…</option>
                  {cityEntry.neighborhoods.map((n) => (
                    <option key={n.en} value={n.en}>{n.en}</option>
                  ))}
                </select>
              ) : (
                <input type="text" className={`rw-input ${errors.neighborhood ? 'rw-input--error' : ''}`}
                  placeholder="Florentin" value={data.neighborhood}
                  onChange={(e) => handleFieldChange('neighborhood', e.target.value)} />
              )}
            </Field>
          </div>
        </div>

        {/* Rent & costs */}
        <div style={{ background: '#fff', borderRadius: '10px', padding: '14px 16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#2d6b5e', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Rent & costs</p>
          <Field label="Monthly rent share (₪)" required error={errors.rentShare}
            hint="What the incoming roommate will pay per month">
            <input type="number" className={`rw-input ${errors.rentShare ? 'rw-input--error' : ''}`}
              placeholder="3500" min="0" value={data.rentShare}
              onChange={(e) => handleFieldChange('rentShare', e.target.value)} />
          </Field>
          <div style={{ marginTop: '10px' }}>
            <Field label="Estimated Additional Monthly Expenses (₪)"
              hint="Electricity, water, internet, VAAD. Leave any blank if not yet known.">
              <div className="rw-utilities-grid">
                {UTILITY_ITEMS.map((item) => (
                  <div key={item.key} className="rw-utility-item">
                    <label className="rw-utility-label" htmlFor={`rw-${item.key}`}>{item.label}</label>
                    <input id={`rw-${item.key}`} type="number" className="rw-input" placeholder="0" min="0"
                      value={data[item.key]} onChange={(e) => onChange(item.key, e.target.value)} />
                  </div>
                ))}
              </div>
              <p className="rw-utilities-total">Total: <strong>₪{sumUtilities(data).toLocaleString()}</strong>/month</p>
            </Field>
          </div>
        </div>

        {/* Apartment details */}
        <div style={{ background: '#fff', borderRadius: '10px', padding: '14px 16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#2d6b5e', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Apartment details</p>
          <div className="rw-field-row">
            <Field label="Total bedrooms" required error={errors.totalBedrooms}>
              <select className={`rw-select ${errors.totalBedrooms ? 'rw-input--error' : ''}`}
                value={data.totalBedrooms} onChange={(e) => handleFieldChange('totalBedrooms', e.target.value)}>
                {[1,2,3,4].map((n) => (
                  <option key={n} value={String(n)}>{n === 4 ? '4+' : n} {n === 1 ? 'bedroom' : 'bedrooms'}</option>
                ))}
              </select>
            </Field>
            <Field label="Total bathrooms">
              <select className="rw-select" value={data.totalBathrooms}
                onChange={(e) => onChange('totalBathrooms', e.target.value)}>
                {[1,2,3].map((n) => (
                  <option key={n} value={String(n)}>{n === 3 ? '3+' : n} {n === 1 ? 'bathroom' : 'bathrooms'}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="rw-field-row" style={{ marginTop: '10px' }}>
            <Field label="Apartment size (sqm)">
              <input type="number" className="rw-input" placeholder="75" min="0"
                value={data.sizeSqm} onChange={(e) => onChange('sizeSqm', e.target.value)} />
            </Field>
            <Field label="Available from" required error={errors.dateAvailable}>
              <input type="date" className={`rw-input ${errors.dateAvailable ? 'rw-input--error' : ''}`}
                min={today} value={data.dateAvailable}
                onChange={(e) => handleFieldChange('dateAvailable', e.target.value)} />
            </Field>
          </div>
          <div style={{ marginTop: '10px' }}>
            <Field label="Minimum lease">
              <select className="rw-select" value={data.minLeaseMonths}
                onChange={(e) => onChange('minLeaseMonths', e.target.value)}>
                {LEASE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Amenities */}
        <div style={{ background: '#fff', borderRadius: '10px', padding: '14px 16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#2d6b5e', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Apartment amenities</p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 10px' }}>Select everything that applies — optional but helps you get better matches</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {AMENITY_OPTIONS.map((amenity) => {
              const isSelected = data.amenities.includes(amenity.value);
              return (
                <button key={amenity.value} type="button" onClick={() => {
                  const next = isSelected
                    ? data.amenities.filter((v) => v !== amenity.value)
                    : [...data.amenities, amenity.value];
                  onChange('amenities', next);
                }} aria-pressed={isSelected}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px',
                    border: `1.5px solid ${isSelected ? '#2d6b5e' : '#e5e7eb'}`,
                    borderRadius: '10px',
                    background: isSelected ? '#2d6b5e' : '#fff',
                    color: isSelected ? '#fff' : '#6b7280',
                    fontSize: '13px', fontWeight: '600',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    transition: 'all 0.15s ease',
                  }}>
                  <span aria-hidden="true" style={{ fontSize: '17px', lineHeight: 1, flexShrink: 0 }}>{amenity.icon}</span>
                  <span>{amenity.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div style={{ background: '#fff', borderRadius: '10px', padding: '14px 16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#2d6b5e', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>About the apartment</p>
          <Field label="" required error={errors.description}
            hint="Describe the vibe — student apartment, WFH-friendly, Shabbat observant, quiet building, etc.">
            <textarea className={`rw-textarea ${errors.description ? 'rw-input--error' : ''}`}
              placeholder="We're a young professional couple looking for a third roommate. The apartment is bright, has a big balcony, and is 5 minutes from the beach..."
              rows={4} maxLength={300} value={data.description}
              onChange={(e) => handleFieldChange('description', e.target.value)} />
            <p className="rw-char-count">
              {data.description.length}/300
              {data.description.trim().length < MIN_DESCRIPTION_LENGTH && (
                <span> — minimum {MIN_DESCRIPTION_LENGTH} characters</span>
              )}
            </p>
          </Field>
        </div>

        {/* Actions */}
        <div style={{ padding: '4px 0 8px' }}>
          <WizardActions onNext={() => { if (validate()) onNext(); }} nextLabel="Continue to photos →" />
          <button type="button" className="rw-cancel-link" onClick={onClose}>Cancel</button>
        </div>

      </div>
    </div>
  );
};

// ── Step 2: Photos (moved from Step 3) ───────────────────────────────────────

const Step2Photos = ({ data, onChange, onNext, onBack }) => {
  const fileInputRef = useRef(null);
  const MAX_PHOTOS = 3;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_PHOTOS - data.photoFiles.length;
    const newFiles = files.slice(0, remaining);
    const newUrls = newFiles.map((file) => URL.createObjectURL(file));
    onChange('photoFiles', [...data.photoFiles, ...newFiles]);
    onChange('photoPreviewUrls', [...data.photoPreviewUrls, ...newUrls]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (index) => {
    URL.revokeObjectURL(data.photoPreviewUrls[index]);
    onChange('photoFiles', data.photoFiles.filter((_, i) => i !== index));
    onChange('photoPreviewUrls', data.photoPreviewUrls.filter((_, i) => i !== index));
  };

  const canAddMore = data.photoFiles.length < MAX_PHOTOS;

  return (
    <div className="rw-step-card">
      <ProgressBar step={2} />
      <StepHeader step={2} title="Add up to 3 photos" />
      <p className="rw-step-intro">
        Show the apartment and common areas — living room, kitchen, balcony. Good photos get 3× more enquiries.
      </p>

      <div className="rw-photo-grid">
        {data.photoPreviewUrls.map((url, index) => (
          <div key={index} className="rw-photo-thumb">
            <img src={url} alt={`Photo ${index + 1}`} className="rw-photo-img" />
            <button type="button" className="rw-photo-remove" onClick={() => handleRemove(index)}
              aria-label={`Remove photo ${index + 1}`}>×</button>
            {index === 0 && <span className="rw-photo-badge">Cover photo</span>}
          </div>
        ))}
        {canAddMore && (
          <button type="button" className="rw-photo-add" onClick={() => fileInputRef.current?.click()}
            aria-label="Add photo">
            <span className="rw-photo-add-icon" aria-hidden="true">+</span>
            <span>{data.photoFiles.length === 0 ? 'Add photos' : 'Add another'}</span>
            <span className="rw-photo-add-count">{data.photoFiles.length + 1}/{MAX_PHOTOS}</span>
          </button>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple
        style={{ display: 'none' }} onChange={handleFileChange} />

      <p className="rw-photo-note">
        {data.photoFiles.length === 0
          ? 'Photos are optional but strongly recommended.'
          : `${MAX_PHOTOS - data.photoFiles.length} photo slot${MAX_PHOTOS - data.photoFiles.length === 1 ? '' : 's'} remaining.`}
      </p>

      <WizardActions onBack={onBack} onNext={onNext} nextLabel="Continue to preferences →" />
    </div>
  );
};

// ── Step 3: Preferences (moved from Step 4) ───────────────────────────────────

const Step3Preferences = ({ data, onChange, onNext, onBack }) => (
  <div className="rw-step-card">
    <ProgressBar step={3} />
    <StepHeader step={3} title="What kind of roommate are you looking for?" />
    <p className="rw-step-intro">Be honest — it leads to better matches for everyone.</p>

    <Field label="I'm most comfortable living with">
      <ToggleGroup options={GENDER_OPTIONS} value={data.genderPreference}
        onChange={(val) => onChange('genderPreference', val)} />
    </Field>
    <Field label="Smoking in the apartment">
      <ToggleGroup options={SMOKING_OPTIONS} value={data.smoking}
        onChange={(val) => onChange('smoking', val)} />
    </Field>
    <Field label="Pets">
      <ToggleGroup options={PETS_OPTIONS} value={data.pets}
        onChange={(val) => onChange('pets', val)} />
    </Field>
    <Field label="Kosher kitchen">
      <ToggleGroup options={KOSHER_OPTIONS} value={data.kosherKitchen}
        onChange={(val) => onChange('kosherKitchen', val)} />
    </Field>
    <Field label="Anything else? (optional)"
      hint="Work from home, religious observance, quiet hours, guests policy...">
      <textarea className="rw-textarea"
        placeholder="We work from home and keep quiet hours after 10pm."
        rows={3} maxLength={300} value={data.vibe}
        onChange={(e) => onChange('vibe', e.target.value)} />
      <p className="rw-char-count">{data.vibe.length}/300</p>
    </Field>

    <WizardActions onBack={onBack} onNext={onNext} nextLabel="Continue to contact details →" />
  </div>
);

// ── Step 4: Contact (moved from Step 1 — collected last) ──────────────────────

const Step4Contact = ({ data, onChange, onNext, onBack }) => {
  const [errors, setErrors] = useState({});

  const selectedCountry = COUNTRY_CODES.find(
    (c) => c.code === data.countryCode && c.label === (data.countryLabel || 'IL')
  ) || COUNTRY_CODES[0];

  const validate = () => {
    const next = {};
    if (!data.phone.trim()) {
      next.phone = 'Phone number is required';
    } else if (!/^[\d\s\-\(\)]{5,15}$/.test(data.phone.trim())) {
      next.phone = 'Please enter a valid phone number';
    }
    if (data.preferredMethod === 'email' && !data.email.trim()) {
      next.email = 'Email is required since you selected it as your preferred contact method';
    } else if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      next.email = 'Please enter a valid email address';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const fullPhone = `${data.countryCode}${data.phone.trim().replace(/^0/, '')}`;

  return (
    <div className="rw-step-card">
      <ProgressBar step={4} />
      <StepHeader step={4} title="How can renters reach you?" />
      <p className="rw-step-intro">
        Your contact details are only shown to people seriously interested in your room. We never share them publicly.
      </p>

      <Field label="Phone number" required error={errors.phone}>
        <div className="rw-phone-row">
          <div className="rw-country-select-wrap">
            <select className="rw-country-select"
              value={`${data.countryCode}|${data.countryLabel || 'IL'}`}
              onChange={(e) => {
                const [code, label] = e.target.value.split('|');
                onChange('countryCode', code);
                onChange('countryLabel', label);
                onChange('phone', '');
              }}
              aria-label="Country code">
              {COUNTRY_CODES.map((c) => (
                <option key={`${c.code}-${c.label}`} value={`${c.code}|${c.label}`}>
                  {c.flag} {c.code} {c.label}
                </option>
              ))}
            </select>
          </div>
          <input type="tel"
            className={`rw-input rw-phone-input ${errors.phone ? 'rw-input--error' : ''}`}
            placeholder={selectedCountry.placeholder}
            value={data.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            autoFocus />
        </div>
        {data.phone.trim() && (
          <p className="rw-phone-preview">Full number: <strong>{fullPhone}</strong></p>
        )}
      </Field>

      <Field label="Email"
        required={data.preferredMethod === 'email'}
        hint={data.preferredMethod === 'email'
          ? 'Required since you selected Email as your preferred contact method'
          : 'Optional — add if you prefer email contact'}
        error={errors.email}>
        <input type="email" className={`rw-input ${errors.email ? 'rw-input--error' : ''}`}
          placeholder="you@example.com" value={data.email}
          onChange={(e) => {
            onChange('email', e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }} />
      </Field>

      <Field label="Preferred contact method">
        <ToggleGroup options={CONTACT_METHODS} value={data.preferredMethod}
          onChange={(val) => {
            onChange('preferredMethod', val);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }} />
      </Field>

      <div className="rw-anon-nudge">
        <span aria-hidden="true">💡</span>
        <p>
          Want to edit your listing later?{' '}
          <a href="/register" target="_blank" rel="noopener noreferrer">Create a free account</a>
          {' '}— takes 30 seconds.
        </p>
      </div>

      <WizardActions onBack={onBack} onNext={() => { if (validate()) onNext(); }}
        nextLabel="Preview my listing →" />
    </div>
  );
};

// ── Step 5: Preview ───────────────────────────────────────────────────────────

const Step5Preview = ({ data, onBack, onPublish, isLoading, uploadingPhotos, publishStage, error }) => {
  const formatPrice = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? `₪${n.toLocaleString()}` : '—';
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('en-IL', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  const locationParts = [
    data.street && `${data.street} ${data.streetNumber}`.trim(),
    data.neighborhood,
    data.city,
  ].filter(Boolean);
  const locationLine = locationParts.join(', ');

  const genderLabel = GENDER_OPTIONS.find((o) => o.value === data.genderPreference)?.label || '—';
  const smokingLabel = SMOKING_OPTIONS.find((o) => o.value === data.smoking)?.label || '—';
  const petsLabel = PETS_OPTIONS.find((o) => o.value === data.pets)?.label || '—';
  const kosherLabel = KOSHER_OPTIONS.find((o) => o.value === data.kosherKitchen)?.label || '—';

  return (
    <div className="rw-step-card">
      <ProgressBar step={5} />
      <StepHeader step={5} title="Here's what renters will see" />
      <p className="rw-step-intro">Review your listing before it goes live. You can go back to make changes.</p>

      <div className="rw-preview-card">
        <div className="rw-preview-photo">
          {data.photoPreviewUrls.length > 0 ? (
            <div className="rw-preview-photo-grid">
              {data.photoPreviewUrls.map((url, i) => (
                <img key={i} src={url} alt={`Photo ${i + 1}`} className="rw-preview-photo-img" />
              ))}
            </div>
          ) : (
            <div className="rw-preview-photo-empty">
              <span aria-hidden="true">📷</span>
              <p>No photos added</p>
            </div>
          )}
        </div>

        <div className="rw-preview-body">
          <p className="rw-preview-price">
            {formatPrice(data.rentShare)}<span>/month</span>
            {sumUtilities(data) > 0 && (
              <span className="rw-preview-utilities">
                {' '}+ {formatPrice(sumUtilities(data))} Estimated Additional Monthly Expenses
              </span>
            )}
          </p>

          <h3 className="rw-preview-location">📍 {locationLine || 'Location not specified'}</h3>

          <div className="rw-preview-specs">
            <span>🛏 {data.totalBedrooms} bed</span>
            <span>🚿 {data.totalBathrooms} bath</span>
            {data.sizeSqm && <span>📐 {data.sizeSqm} sqm</span>}
            <span>📅 Available {formatDate(data.dateAvailable)}</span>
            <span>⏳ Min {data.minLeaseMonths} months</span>
          </div>

          {data.description && <p className="rw-preview-description">{data.description}</p>}

          {data.amenities.length > 0 && (
            <div className="rw-preview-prefs">
              {data.amenities.map((value) => {
                const option = AMENITY_OPTIONS.find((a) => a.value === value);
                return (
                  <span key={value} className="rw-preview-pref-tag">
                    {option?.icon} {option?.label || value}
                  </span>
                );
              })}
            </div>
          )}

          <div className="rw-preview-prefs">
            <span className="rw-preview-pref-tag">👥 {genderLabel}</span>
            <span className="rw-preview-pref-tag">🚬 Smoking: {smokingLabel}</span>
            <span className="rw-preview-pref-tag">🐾 Pets: {petsLabel}</span>
            <span className="rw-preview-pref-tag">✡️ Kosher: {kosherLabel}</span>
          </div>

          {data.vibe && <p className="rw-preview-vibe">💬 "{data.vibe}"</p>}
        </div>
      </div>

      {error && <p className="rw-publish-error">{error}</p>}

      <WizardActions onBack={onBack} onNext={onPublish} nextLabel="🚀 Go Live!" backLabel="Edit listing"
        isLoading={isLoading}
        loadingLabel={publishStage || (uploadingPhotos ? 'Uploading photos...' : 'Publishing...')} />

      <p className="rw-publish-note">
        Your listing will be visible immediately. It expires automatically after 60 days.
      </p>
    </div>
  );
};

// ── Main wizard container ─────────────────────────────────────────────────────

const RoommateWizard = ({ onClose }) => {
  const history = useHistory();
  const [step, setStep] = useState(1);
  const [data, setData] = useState(createInitialData);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishStage, setPublishStage] = useState('');

  const onChange = useCallback((field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const nextStep = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS)), []);
  const prevStep = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  const retryWithBackoff = async (fn, { retries = 2, delayMs = 2000 } = {}) => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try { return await fn(); } catch (err) {
        lastError = err;
        if (attempt === retries) throw err;
        if (attempt === 0) setPublishStage('Server is waking up — retrying...');
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
    throw lastError;
  };

  const handlePublish = async () => {
    setPublishError('');
    setIsLoading(true);
    try {
      let uploadedImageUrls = [];
      let photoUploadWarning = '';
      if (data.photoFiles.length > 0) {
        setUploadingPhotos(true);
        try {
          const { urls, failedCount } = await uploadPhotosToCloudinary(data.photoFiles);
          uploadedImageUrls = urls;
          if (failedCount > 0 && urls.length > 0) {
            photoUploadWarning = `${failedCount} of ${data.photoFiles.length} photos failed to upload. Publishing with the ${urls.length} that succeeded.`;
          } else if (failedCount > 0 && urls.length === 0) {
            photoUploadWarning = 'All photos failed to upload. Publishing without photos — you can add them later.';
          }
        } catch (uploadErr) {
          console.error('[RoommateWizard] Photo upload error:', uploadErr);
          photoUploadWarning = 'Photos failed to upload. Publishing without them.';
          uploadedImageUrls = [];
        } finally {
          setUploadingPhotos(false);
        }
      }

      const payload = {
        contact: {
          phone: `${data.countryCode}${data.phone.trim().replace(/^0/, '')}`,
          email: data.email.trim() || undefined,
          preferredMethod: data.preferredMethod,
        },
        address: {
          street: data.street.trim(),
          streetNumber: data.streetNumber.trim(),
          neighborhood: data.neighborhood.trim(),
          city: data.city.trim(),
          country: 'Israel',
          ...(typeof data.lat === 'number' && typeof data.lng === 'number'
            ? { lat: data.lat, lng: data.lng } : {}),
        },
        cityMatchedKnownList: Boolean(findCityEntry(data.city)),
        rentShare: Number(data.rentShare),
        utilitiesEstimate: sumUtilities(data),
        utilities: {
          electricity: Number(data.utilityElectricity) || 0,
          water: Number(data.utilityWater) || 0,
          internet: Number(data.utilityInternet) || 0,
          vaad: Number(data.utilityVaad) || 0,
        },
        totalBedrooms: Number(data.totalBedrooms),
        totalBathrooms: Number(data.totalBathrooms),
        sizeSqm: data.sizeSqm ? Number(data.sizeSqm) : undefined,
        dateAvailable: data.dateAvailable,
        minLeaseMonths: Number(data.minLeaseMonths),
        description: data.description.trim() || undefined,
        images: uploadedImageUrls,
        amenities: data.amenities,
        genderPreference: data.genderPreference,
        lifestyle: {
          smoking: data.smoking,
          pets: data.pets,
          kosherKitchen: data.kosherKitchen,
          vibe: data.vibe.trim() || undefined,
        },
      };

      await retryWithBackoff(() => createRoommateListing(payload));

      if (photoUploadWarning && typeof window !== 'undefined') {
        window.alert(photoUploadWarning);
      }

      setPublishStage('');
      onClose?.();
      history.push('/?type=roommates');
    } catch (err) {
      setPublishStage('');
      setPublishError(err?.response?.data?.message || 'Failed to publish listing. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rw-overlay" role="dialog" aria-modal="true" aria-label="List your room">
      <div className="rw-container">
        {step === 1 && <Step1Apartment data={data} onChange={onChange} onNext={nextStep} onClose={onClose} />}
        {step === 2 && <Step2Photos data={data} onChange={onChange} onNext={nextStep} onBack={prevStep} />}
        {step === 3 && <Step3Preferences data={data} onChange={onChange} onNext={nextStep} onBack={prevStep} />}
        {step === 4 && <Step4Contact data={data} onChange={onChange} onNext={nextStep} onBack={prevStep} />}
        {step === 5 && (
          <Step5Preview data={data} onBack={prevStep} onPublish={handlePublish}
            isLoading={isLoading} uploadingPhotos={uploadingPhotos}
            publishStage={publishStage} error={publishError} />
        )}
      </div>
    </div>
  );
};

export default RoommateWizard;
