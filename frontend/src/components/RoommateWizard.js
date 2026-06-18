/**
 * RoommateWizard.js
 *
 * Dedicated 4-step wizard for creating a roommate listing.
 * Launched from the "List my room" button in RoommatesView.
 *
 * Step 1 — Contact        (phone, email, preferred method)
 * Step 2 — Your Apartment (address, rent, utilities, bedrooms, sqm, date, lease, description)
 * Step 3 — Photos         (up to 3 apartment/common area photos)
 * Step 4 — Preferences    (gender, smoking, pets, kosher, vibe)
 * Step 5 — Preview        (full card preview → Go Live!)
 *
 * On publish: calls createRoommateListing() → redirects to /?type=roommates
 * On cancel: fires onClose() prop
 *
 * Structured for future extraction to /roommates/new route.
 */

import React, { useState, useCallback, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { createRoommateListing } from '../services/api';
import './RoommateWizard.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5; // 4 input steps + 1 preview step

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

const CONTACT_METHODS = [
  { value: 'phone', label: 'Phone call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
];

// Most common country codes for HomeKey's user base —
// Israeli locals + Anglo expat community (SA, UK, US, AU, CA, FR, DE)
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
  // Step 1 — Contact
  phone: '',
  countryCode: '+972',
  email: '',
  preferredMethod: 'whatsapp',

  // Step 2 — Apartment
  city: '',
  street: '',
  streetNumber: '',
  neighborhood: '',
  rentShare: '',
  utilitiesEstimate: '',
  totalBedrooms: '1',
  sizeSqm: '',
  dateAvailable: '',
  minLeaseMonths: '6',
  description: '',

  // Step 3 — Photos
  photoFiles: [],
  photoPreviewUrls: [],

  // Step 4 — Preferences
  genderPreference: 'no-preference',
  smoking: 'not-allowed',
  pets: 'not-allowed',
  kosherKitchen: 'no',
  vibe: '',
});

// ── Shared sub-components ─────────────────────────────────────────────────────

const ProgressBar = ({ step }) => (
  <div className="rw-progress-rail">
    <div
      className="rw-progress-fill"
      style={{ width: `${Math.round((step / TOTAL_STEPS) * 100)}%` }}
    />
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
      <button
        key={opt.value}
        type="button"
        className={`rw-toggle-btn ${value === opt.value ? 'is-active' : ''}`}
        onClick={() => onChange(opt.value)}
        aria-pressed={value === opt.value}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

const WizardActions = ({ onBack, onNext, nextLabel = 'Continue', backLabel = 'Back', nextDisabled = false, isLoading = false }) => (
  <div className="rw-actions">
    {onBack && (
      <button type="button" className="rw-btn rw-btn--ghost" onClick={onBack}>
        {backLabel}
      </button>
    )}
    <button
      type="button"
      className="rw-btn rw-btn--primary"
      onClick={onNext}
      disabled={nextDisabled || isLoading}
    >
      {isLoading ? 'Publishing...' : nextLabel}
    </button>
  </div>
);

// ── Step 1: Contact ───────────────────────────────────────────────────────────

const Step1Contact = ({ data, onChange, onNext, onClose }) => {
  const [errors, setErrors] = useState({});

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === data.countryCode && c.label === (data.countryLabel || 'IL'))
    || COUNTRY_CODES[0];

  const validate = () => {
    const next = {};
    if (!data.phone.trim()) {
      next.phone = 'Phone number is required';
    } else if (!/^[\d\s\-\(\)]{5,15}$/.test(data.phone.trim())) {
      next.phone = 'Please enter a valid phone number';
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      next.email = 'Please enter a valid email address';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  // Build the full phone number for storage: countryCode + local number
  const fullPhone = `${data.countryCode}${data.phone.trim().replace(/^0/, '')}`;

  return (
    <div className="rw-step-card">
      <ProgressBar step={1} />
      <StepHeader step={1} title="How can renters reach you?" />
      <p className="rw-step-intro">
        Your contact details are only shown to people seriously interested in your room. We never share them publicly.
      </p>

      <Field label="Phone number" required error={errors.phone}>
        <div className="rw-phone-row">
          {/* Country code selector */}
          <div className="rw-country-select-wrap">
            <select
              className="rw-country-select"
              value={`${data.countryCode}|${data.countryLabel || 'IL'}`}
              onChange={(e) => {
                const [code, label] = e.target.value.split('|');
                onChange('countryCode', code);
                onChange('countryLabel', label);
                onChange('phone', '');
              }}
              aria-label="Country code"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={`${c.code}-${c.label}`} value={`${c.code}|${c.label}`}>
                  {c.flag} {c.code} {c.label}
                </option>
              ))}
            </select>
          </div>
          {/* Local number input */}
          <input
            type="tel"
            className={`rw-input rw-phone-input ${errors.phone ? 'rw-input--error' : ''}`}
            placeholder={selectedCountry.placeholder}
            value={data.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            autoFocus
          />
        </div>
        {data.phone.trim() && (
          <p className="rw-phone-preview">
            Full number: <strong>{fullPhone}</strong>
          </p>
        )}
      </Field>

      <Field label="Email" hint="Optional — add if you prefer email contact" error={errors.email}>
        <input
          type="email"
          className={`rw-input ${errors.email ? 'rw-input--error' : ''}`}
          placeholder="you@example.com"
          value={data.email}
          onChange={(e) => onChange('email', e.target.value)}
        />
      </Field>

      <Field label="Preferred contact method">
        <ToggleGroup
          options={CONTACT_METHODS}
          value={data.preferredMethod}
          onChange={(val) => onChange('preferredMethod', val)}
        />
      </Field>

      <div className="rw-anon-nudge">
        <span aria-hidden="true">💡</span>
        <p>
          Want to edit your listing later?{' '}
          <a href="/register" target="_blank" rel="noopener noreferrer">
            Create a free account
          </a>{' '}
          — takes 30 seconds.
        </p>
      </div>

      <WizardActions
        onNext={handleNext}
        nextLabel="Continue to apartment details →"
      />
      <button type="button" className="rw-cancel-link" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
};

// ── Step 2: Apartment Details ─────────────────────────────────────────────────

const Step2Apartment = ({ data, onChange, onNext, onBack }) => {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const next = {};
    if (!data.city.trim()) next.city = 'City is required';
    if (!data.rentShare || isNaN(Number(data.rentShare)) || Number(data.rentShare) <= 0) {
      next.rentShare = 'Please enter a valid monthly rent';
    }
    if (!data.totalBedrooms || Number(data.totalBedrooms) < 1) {
      next.totalBedrooms = 'Please select the number of bedrooms';
    }
    if (!data.dateAvailable) next.dateAvailable = 'Please select an available from date';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="rw-step-card">
      <ProgressBar step={2} />
      <StepHeader step={2} title="Tell us about your apartment" />

      <div className="rw-field-row">
        <Field label="City" required error={errors.city}>
          <input
            type="text"
            className={`rw-input ${errors.city ? 'rw-input--error' : ''}`}
            placeholder="Tel Aviv-Yafo"
            value={data.city}
            onChange={(e) => onChange('city', e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Neighborhood">
          <input
            type="text"
            className="rw-input"
            placeholder="Florentin"
            value={data.neighborhood}
            onChange={(e) => onChange('neighborhood', e.target.value)}
          />
        </Field>
      </div>

      <div className="rw-field-row">
        <Field label="Street">
          <input
            type="text"
            className="rw-input"
            placeholder="Rothschild Blvd"
            value={data.street}
            onChange={(e) => onChange('street', e.target.value)}
          />
        </Field>
        <Field label="Number">
          <input
            type="text"
            className="rw-input rw-input--short"
            placeholder="42"
            value={data.streetNumber}
            onChange={(e) => onChange('streetNumber', e.target.value)}
          />
        </Field>
      </div>

      <div className="rw-field-row">
        <Field label="Monthly rent share (₪)" required error={errors.rentShare}
          hint="What the incoming roommate will pay per month">
          <input
            type="number"
            className={`rw-input ${errors.rentShare ? 'rw-input--error' : ''}`}
            placeholder="3500"
            min="0"
            value={data.rentShare}
            onChange={(e) => onChange('rentShare', e.target.value)}
          />
        </Field>
        <Field label="Utilities estimate (₪/month)"
          hint="Electricity, water, internet, vaad">
          <input
            type="number"
            className="rw-input"
            placeholder="400"
            min="0"
            value={data.utilitiesEstimate}
            onChange={(e) => onChange('utilitiesEstimate', e.target.value)}
          />
        </Field>
      </div>

      <div className="rw-field-row">
        <Field label="Total bedrooms in apartment" required error={errors.totalBedrooms}>
          <select
            className={`rw-select ${errors.totalBedrooms ? 'rw-input--error' : ''}`}
            value={data.totalBedrooms}
            onChange={(e) => onChange('totalBedrooms', e.target.value)}
          >
            {[1,2,3,4,5,6].map((n) => (
              <option key={n} value={String(n)}>{n} {n === 1 ? 'bedroom' : 'bedrooms'}</option>
            ))}
          </select>
        </Field>
        <Field label="Apartment size (sqm)">
          <input
            type="number"
            className="rw-input"
            placeholder="75"
            min="0"
            value={data.sizeSqm}
            onChange={(e) => onChange('sizeSqm', e.target.value)}
          />
        </Field>
      </div>

      <div className="rw-field-row">
        <Field label="Available from" required error={errors.dateAvailable}>
          <input
            type="date"
            className={`rw-input ${errors.dateAvailable ? 'rw-input--error' : ''}`}
            min={today}
            value={data.dateAvailable}
            onChange={(e) => onChange('dateAvailable', e.target.value)}
          />
        </Field>
        <Field label="Minimum lease">
          <select
            className="rw-select"
            value={data.minLeaseMonths}
            onChange={(e) => onChange('minLeaseMonths', e.target.value)}
          >
            {LEASE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="About the apartment"
        hint="Describe the vibe — student apartment, WFH-friendly, Shabbat observant, quiet building, etc. (optional)"
      >
        <textarea
          className="rw-textarea"
          placeholder="We're a young professional couple looking for a third roommate. The apartment is bright, has a big balcony, and is 5 minutes from the beach..."
          rows={4}
          maxLength={300}
          value={data.description}
          onChange={(e) => onChange('description', e.target.value)}
        />
        <p className="rw-char-count">{data.description.length}/300</p>
      </Field>

      <WizardActions
        onBack={onBack}
        onNext={handleNext}
        nextLabel="Continue to photos →"
      />
    </div>
  );
};

// ── Step 3: Photos ────────────────────────────────────────────────────────────

const Step3Photos = ({ data, onChange, onNext, onBack }) => {
  const fileInputRef = useRef(null);
  const MAX_PHOTOS = 3;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_PHOTOS - data.photoFiles.length;
    const newFiles = files.slice(0, remaining);

    const newUrls = newFiles.map((file) => URL.createObjectURL(file));
    onChange('photoFiles', [...data.photoFiles, ...newFiles]);
    onChange('photoPreviewUrls', [...data.photoPreviewUrls, ...newUrls]);

    // Reset input so same file can be re-selected after removal
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (index) => {
    const newFiles = data.photoFiles.filter((_, i) => i !== index);
    const newUrls = data.photoPreviewUrls.filter((_, i) => i !== index);
    // Revoke the object URL to free memory
    URL.revokeObjectURL(data.photoPreviewUrls[index]);
    onChange('photoFiles', newFiles);
    onChange('photoPreviewUrls', newUrls);
  };

  const canAddMore = data.photoFiles.length < MAX_PHOTOS;

  return (
    <div className="rw-step-card">
      <ProgressBar step={3} />
      <StepHeader step={3} title="Add up to 3 photos" />
      <p className="rw-step-intro">
        Show the apartment and common areas — living room, kitchen, balcony. No profile photos needed.
        Good photos get 3× more enquiries.
      </p>

      <div className="rw-photo-grid">
        {data.photoPreviewUrls.map((url, index) => (
          <div key={index} className="rw-photo-thumb">
            <img src={url} alt={`Photo ${index + 1}`} className="rw-photo-img" />
            <button
              type="button"
              className="rw-photo-remove"
              onClick={() => handleRemove(index)}
              aria-label={`Remove photo ${index + 1}`}
            >
              ×
            </button>
            {index === 0 && (
              <span className="rw-photo-badge">Cover photo</span>
            )}
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            className="rw-photo-add"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Add photo"
          >
            <span className="rw-photo-add-icon" aria-hidden="true">+</span>
            <span>{data.photoFiles.length === 0 ? 'Add photos' : 'Add another'}</span>
            <span className="rw-photo-add-count">
              {data.photoFiles.length}/{MAX_PHOTOS}
            </span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <p className="rw-photo-note">
        {data.photoFiles.length === 0
          ? 'Photos are optional but strongly recommended.'
          : `${MAX_PHOTOS - data.photoFiles.length} photo slot${MAX_PHOTOS - data.photoFiles.length === 1 ? '' : 's'} remaining.`}
      </p>

      <WizardActions
        onBack={onBack}
        onNext={onNext}
        nextLabel="Continue to preferences →"
      />
    </div>
  );
};

// ── Step 4: Preferences ───────────────────────────────────────────────────────

const Step4Preferences = ({ data, onChange, onNext, onBack }) => (
  <div className="rw-step-card">
    <ProgressBar step={4} />
    <StepHeader step={4} title="What kind of roommate are you looking for?" />
    <p className="rw-step-intro">
      Be honest — it leads to better matches for everyone.
    </p>

    <Field label="I'm most comfortable living with">
      <ToggleGroup
        options={GENDER_OPTIONS}
        value={data.genderPreference}
        onChange={(val) => onChange('genderPreference', val)}
      />
    </Field>

    <Field label="Smoking in the apartment">
      <ToggleGroup
        options={SMOKING_OPTIONS}
        value={data.smoking}
        onChange={(val) => onChange('smoking', val)}
      />
    </Field>

    <Field label="Pets">
      <ToggleGroup
        options={PETS_OPTIONS}
        value={data.pets}
        onChange={(val) => onChange('pets', val)}
      />
    </Field>

    <Field label="Kosher kitchen">
      <ToggleGroup
        options={KOSHER_OPTIONS}
        value={data.kosherKitchen}
        onChange={(val) => onChange('kosherKitchen', val)}
      />
    </Field>

    <Field
      label="Anything else? (optional)"
      hint="Work from home, religious observance, quiet hours, guests policy..."
    >
      <textarea
        className="rw-textarea"
        placeholder="We work from home and keep quiet hours after 10pm. Happy people and good vibes only."
        rows={3}
        maxLength={300}
        value={data.vibe}
        onChange={(e) => onChange('vibe', e.target.value)}
      />
      <p className="rw-char-count">{data.vibe.length}/300</p>
    </Field>

    <WizardActions
      onBack={onBack}
      onNext={onNext}
      nextLabel="Preview my listing →"
    />
  </div>
);

// ── Step 5: Preview ───────────────────────────────────────────────────────────

const Step5Preview = ({ data, onBack, onPublish, isLoading, error }) => {
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

  const locationParts = [data.street && `${data.street} ${data.streetNumber}`.trim(), data.neighborhood, data.city].filter(Boolean);
  const locationLine = locationParts.join(', ');

  const genderLabel = GENDER_OPTIONS.find((o) => o.value === data.genderPreference)?.label || '—';
  const smokingLabel = SMOKING_OPTIONS.find((o) => o.value === data.smoking)?.label || '—';
  const petsLabel = PETS_OPTIONS.find((o) => o.value === data.pets)?.label || '—';
  const kosherLabel = KOSHER_OPTIONS.find((o) => o.value === data.kosherKitchen)?.label || '—';

  return (
    <div className="rw-step-card">
      <ProgressBar step={5} />
      <StepHeader step={5} title="Here's what renters will see" />
      <p className="rw-step-intro">
        Review your listing before it goes live. You can go back to make changes.
      </p>

      {/* Preview card */}
      <div className="rw-preview-card">
        {/* Cover photo */}
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

        {/* Details */}
        <div className="rw-preview-body">
          <p className="rw-preview-price">
            {formatPrice(data.rentShare)}
            <span>/month</span>
            {data.utilitiesEstimate && Number(data.utilitiesEstimate) > 0 && (
              <span className="rw-preview-utilities">
                {' '}+ {formatPrice(data.utilitiesEstimate)} utilities
              </span>
            )}
          </p>

          <h3 className="rw-preview-location">📍 {locationLine || 'Location not specified'}</h3>

          <div className="rw-preview-specs">
            <span>🛏 {data.totalBedrooms} bed</span>
            {data.sizeSqm && <span>📐 {data.sizeSqm} sqm</span>}
            <span>📅 Available {formatDate(data.dateAvailable)}</span>
            <span>⏳ Min {data.minLeaseMonths} months</span>
          </div>

          {data.description && (
            <p className="rw-preview-description">{data.description}</p>
          )}

          <div className="rw-preview-prefs">
            <span className="rw-preview-pref-tag">👥 {genderLabel}</span>
            <span className="rw-preview-pref-tag">🚬 Smoking: {smokingLabel}</span>
            <span className="rw-preview-pref-tag">🐾 Pets: {petsLabel}</span>
            <span className="rw-preview-pref-tag">✡️ Kosher: {kosherLabel}</span>
          </div>

          {data.vibe && (
            <p className="rw-preview-vibe">💬 "{data.vibe}"</p>
          )}
        </div>
      </div>

      {error && <p className="rw-publish-error">{error}</p>}

      <WizardActions
        onBack={onBack}
        onNext={onPublish}
        nextLabel="🚀 Go Live!"
        backLabel="Edit listing"
        isLoading={isLoading}
      />

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
  const [publishError, setPublishError] = useState('');

  const onChange = useCallback((field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const nextStep = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS)), []);
  const prevStep = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  const handlePublish = async () => {
    setPublishError('');
    setIsLoading(true);

    try {
      // Note: photo upload to cloud storage is a future enhancement.
      // For now we submit the listing without images and add URL support later.
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
        },
        rentShare: Number(data.rentShare),
        utilitiesEstimate: data.utilitiesEstimate ? Number(data.utilitiesEstimate) : 0,
        totalBedrooms: Number(data.totalBedrooms),
        sizeSqm: data.sizeSqm ? Number(data.sizeSqm) : undefined,
        dateAvailable: data.dateAvailable,
        minLeaseMonths: Number(data.minLeaseMonths),
        description: data.description.trim() || undefined,
        images: [], // TODO: upload files to cloud storage, then pass URLs here
        genderPreference: data.genderPreference,
        lifestyle: {
          smoking: data.smoking,
          pets: data.pets,
          kosherKitchen: data.kosherKitchen,
          vibe: data.vibe.trim() || undefined,
        },
      };

      await createRoommateListing(payload);

      // Success — go to Browse Rooms to see the new listing
      history.push('/?type=roommates');
    } catch (err) {
      setPublishError(err?.response?.data?.message || 'Failed to publish listing. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rw-overlay" role="dialog" aria-modal="true" aria-label="List your room">
      <div className="rw-container">
        {step === 1 && (
          <Step1Contact data={data} onChange={onChange} onNext={nextStep} onClose={onClose} />
        )}
        {step === 2 && (
          <Step2Apartment data={data} onChange={onChange} onNext={nextStep} onBack={prevStep} />
        )}
        {step === 3 && (
          <Step3Photos data={data} onChange={onChange} onNext={nextStep} onBack={prevStep} />
        )}
        {step === 4 && (
          <Step4Preferences data={data} onChange={onChange} onNext={nextStep} onBack={prevStep} />
        )}
        {step === 5 && (
          <Step5Preview
            data={data}
            onBack={prevStep}
            onPublish={handlePublish}
            isLoading={isLoading}
            error={publishError}
          />
        )}
      </div>
    </div>
  );
};

export default RoommateWizard;
