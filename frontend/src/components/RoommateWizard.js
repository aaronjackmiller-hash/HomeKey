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
import { createRoommateListing, geocodeAddress } from '../services/api';
import ISRAEL_LOCATIONS from '../israelLocations';
import './RoommateWizard.css';

// ── Cloudinary config ───────────────────────────────────────────────────────
// Unsigned upload preset — safe to expose in frontend code, scoped to the
// homekey/roommates folder only. No API secret involved.
const CLOUDINARY_CLOUD_NAME = 'dxz5neie0';
const CLOUDINARY_UPLOAD_PRESET = 'txkn4ah1';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Uploads a single File to Cloudinary using the unsigned upload preset.
 * Returns the secure_url string on success, or null on failure.
 */
const uploadPhotoToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Photo upload failed (${response.status})`);
  }

  const result = await response.json();
  return result.secure_url || null;
};

/**
 * Uploads multiple photo Files to Cloudinary in parallel.
 * Returns { urls, failedCount } — urls for successful uploads,
 * failedCount so the caller can tell the user if some/all photos
 * failed instead of silently publishing without them.
 */
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
      // eslint-disable-next-line no-console
      console.error(
        `[RoommateWizard] Photo ${index + 1} failed to upload to Cloudinary:`,
        result.status === 'rejected' ? result.reason : 'No URL returned'
      );
    }
  });

  return { urls, failedCount };
};

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

// Same vocabulary as the backend RoommateListing model's amenities enum,
// so a value picked here saves cleanly without server-side rejection.
const AMENITY_OPTIONS = [
  { value: 'elevator', label: 'Elevator', icon: '🛗' },
  { value: 'parking', label: 'Parking', icon: '🚗' },
  { value: 'pets', label: 'Pets OK', icon: '🐾' },
  { value: 'disabled-access', label: 'Accessible', icon: '♿' },
  { value: 'renovated', label: 'Renovated', icon: '🔨' },
  { value: 'furnished', label: 'Furnished', icon: '🛋️' },
  { value: 'mamad', label: 'Mamad', icon: '🛡️' },
  { value: 'oven', label: 'Oven', icon: '🍳' },
  { value: 'balcony', label: 'Balcony', icon: '🌇' },
  { value: 'stovetop', label: 'Stovetop', icon: '🔥' },
  { value: 'laundry-facilities', label: 'Laundry', icon: '🧺' },
  { value: 'in-unit-washer-dryer', label: 'Washer/Dryer', icon: '🌀' },
  { value: 'dishwasher', label: 'Dishwasher', icon: '🍽️' },
];

// The four components that make up "Estimated Additional Monthly Expenses".
// Stored as separate fields so the lister can itemize them; the wizard sums
// these automatically rather than asking for one opaque lump number.
const UTILITY_ITEMS = [
  { key: 'utilityElectricity', label: 'Electricity' },
  { key: 'utilityWater', label: 'Water' },
  { key: 'utilityInternet', label: 'Internet' },
  { key: 'utilityVaad', label: 'VAAD (building fee)' },
];

const sumUtilities = (data) =>
  UTILITY_ITEMS.reduce((sum, item) => sum + (Number(data[item.key]) || 0), 0);

const MIN_DESCRIPTION_LENGTH = 15;

// Matches freely-typed city input (e.g. "Tel Aviv-Yafo", "tel aviv") against
// israelLocations.js's city names, since the City field is a plain text
// input, not constrained to this list's exact spelling.
const normalizeCityName = (value) =>
    String(value || '').trim().toLowerCase().replace(/[-–—].*$/, '').trim();

const findCityEntry = (cityInput) => {
    const normalizedInput = normalizeCityName(cityInput);
    if (!normalizedInput) return null;
    return ISRAEL_LOCATIONS.find((entry) => {
        const normalizedEntryCity = normalizeCityName(entry.city.en);
        return (
            normalizedEntryCity === normalizedInput
            || normalizedInput.startsWith(normalizedEntryCity)
            || normalizedEntryCity.startsWith(normalizedInput)
        );
    }) || null;
};

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

const WizardActions = ({ onBack, onNext, nextLabel = 'Continue', backLabel = 'Back', nextDisabled = false, isLoading = false, loadingLabel = 'Publishing...' }) => (
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
      {isLoading ? loadingLabel : nextLabel}
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
    if (data.preferredMethod === 'email' && !data.email.trim()) {
      next.email = 'Email is required since you selected it as your preferred contact method';
    } else if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
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

      <Field
        label="Email"
        required={data.preferredMethod === 'email'}
        hint={data.preferredMethod === 'email'
          ? "Required since you selected Email as your preferred contact method"
          : "Optional — add if you prefer email contact"}
        error={errors.email}
      >
        <input
          type="email"
          className={`rw-input ${errors.email ? 'rw-input--error' : ''}`}
          placeholder="you@example.com"
          value={data.email}
          onChange={(e) => {
            onChange('email', e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
        />
      </Field>

      <Field label="Preferred contact method">
        <ToggleGroup
          options={CONTACT_METHODS}
          value={data.preferredMethod}
          onChange={(val) => {
            onChange('preferredMethod', val);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
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

  // Clears a single field's error as soon as the user changes it,
  // instead of leaving a stale error message visible until the next
  // "Continue" click re-runs full validation.
  const handleFieldChange = (field, value) => {
    onChange(field, value);
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Guards against a race condition where an earlier (slower) geocode
  // request resolves after a later one and overwrites a correct result
  // with a stale one.
  const geocodeRequestIdRef = useRef(0);

  // Derives lat/lng from street + city using Google Geocoding, for use on
  // the map. Triggered ONLY on blur of the Number field — the last and most
  // specific piece of the address — so we don't fire multiple competing
  // requests as the lister fills in City, then Street, then Number.
  //
  // NOTE: this used to also try to auto-fill Neighborhood from Google's
  // response, but extensive testing (forward geocode, restricted reverse
  // geocode, and an unrestricted reverse geocode scanning every result)
  // confirmed Google's Geocoding API simply doesn't carry neighborhood-level
  // data for many Israeli addresses — only city-level. Neighborhood is now
  // sourced from israelLocations.js instead (see cityEntry/the Neighborhood
  // field below), which is far more reliable for the cities it covers.
  const tryAutoFillCoordinates = async () => {
    const street = data.street.trim();
    const city = data.city.trim();
    if (!street || !city) return;

    const requestId = ++geocodeRequestIdRef.current;
    try {
      const result = await geocodeAddress({
        street,
        streetNumber: data.streetNumber.trim(),
        city,
      });
      // If a newer request has started since this one was sent, discard
      // this result — it's stale.
      if (requestId !== geocodeRequestIdRef.current) return;
      // Every other endpoint in this app wraps its JSON body as
      // { data: ... } (see getRoommateListing, getRoommateListings) and
      // geocodeAddress() is implemented identically — it just returns
      // response.data straight through. Handling both shapes here so it
      // works regardless of which one the backend actually sends.
      const geocoded = result?.data ?? result;
      if (typeof geocoded?.lat === 'number' && typeof geocoded?.lng === 'number') {
        onChange('lat', geocoded.lat);
        onChange('lng', geocoded.lng);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[RoommateWizard] Coordinate geocode lookup failed:', err);
    }
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  // Changing the city invalidates whatever neighborhood was previously
  // selected/typed — a leftover "Florentin" doesn't make sense once the
  // city changes to Jerusalem.
  const handleCityChange = (value) => {
    handleFieldChange('city', value);
    onChange('neighborhood', '');
  };

  const cityEntry = findCityEntry(data.city);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="rw-step-card">
      <ProgressBar step={2} />
      <StepHeader step={2} title="Tell us about your apartment" />

      <Field label="City" required error={errors.city}>
        <input
          type="text"
          className={`rw-input ${errors.city ? 'rw-input--error' : ''}`}
          placeholder="Tel Aviv-Yafo"
          value={data.city}
          onChange={(e) => handleCityChange(e.target.value)}
          autoFocus
        />
      </Field>

      <div className="rw-field-row">
        <Field label="Street" required error={errors.street}>
          <input
            type="text"
            className={`rw-input ${errors.street ? 'rw-input--error' : ''}`}
            placeholder="Rothschild Blvd"
            value={data.street}
            onChange={(e) => handleFieldChange('street', e.target.value)}
            onBlur={() => {
              // Fallback for addresses with no street number — geocode
              // right away rather than waiting on a Number field the
              // lister may never fill in.
              if (!data.streetNumber.trim()) tryAutoFillCoordinates();
            }}
          />
        </Field>
        <Field label="Number">
          <input
            type="text"
            className="rw-input rw-input--short"
            placeholder="42"
            value={data.streetNumber}
            onChange={(e) => onChange('streetNumber', e.target.value)}
            onBlur={tryAutoFillCoordinates}
          />
        </Field>
      </div>

      <Field
        label="Neighborhood"
        required
        error={errors.neighborhood}
        hint={cityEntry
          ? 'Select the neighborhood that best matches your address'
          : 'Type your neighborhood'}
      >
        {cityEntry ? (
          <select
            className={`rw-select ${errors.neighborhood ? 'rw-input--error' : ''}`}
            value={data.neighborhood}
            onChange={(e) => handleFieldChange('neighborhood', e.target.value)}
          >
            <option value="">Select a neighborhood…</option>
            {cityEntry.neighborhoods.map((n) => (
              <option key={n.en} value={n.en}>{n.en}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            className={`rw-input ${errors.neighborhood ? 'rw-input--error' : ''}`}
            placeholder="Florentin"
            value={data.neighborhood}
            onChange={(e) => handleFieldChange('neighborhood', e.target.value)}
          />
        )}
      </Field>


      <div className="rw-field-row">
        <Field label="Monthly rent share (₪)" required error={errors.rentShare}
          hint="What the incoming roommate will pay per month">
          <input
            type="number"
            className={`rw-input ${errors.rentShare ? 'rw-input--error' : ''}`}
            placeholder="3500"
            min="0"
            value={data.rentShare}
            onChange={(e) => handleFieldChange('rentShare', e.target.value)}
          />
        </Field>
      </div>

      <Field
        label="Estimated Additional Monthly Expenses (₪)"
        hint="Itemized — electricity, water, internet, VAAD. Leave any blank if not yet known."
      >
        <div className="rw-utilities-grid">
          {UTILITY_ITEMS.map((item) => (
            <div key={item.key} className="rw-utility-item">
              <label className="rw-utility-label" htmlFor={`rw-${item.key}`}>{item.label}</label>
              <input
                id={`rw-${item.key}`}
                type="number"
                className="rw-input"
                placeholder="0"
                min="0"
                value={data[item.key]}
                onChange={(e) => onChange(item.key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <p className="rw-utilities-total">
          Total: <strong>₪{sumUtilities(data).toLocaleString()}</strong>/month
        </p>
      </Field>

      <div className="rw-field-row">
        <Field label="Total bedrooms in apartment" required error={errors.totalBedrooms}>
          <select
            className={`rw-select ${errors.totalBedrooms ? 'rw-input--error' : ''}`}
            value={data.totalBedrooms}
            onChange={(e) => handleFieldChange('totalBedrooms', e.target.value)}
          >
            {[1,2,3,4,5,6].map((n) => (
              <option key={n} value={String(n)}>{n} {n === 1 ? 'bedroom' : 'bedrooms'}</option>
            ))}
          </select>
        </Field>
        <Field label="Total bathrooms in apartment">
          <select
            className="rw-select"
            value={data.totalBathrooms}
            onChange={(e) => onChange('totalBathrooms', e.target.value)}
          >
            {[1,2,3,4].map((n) => (
              <option key={n} value={String(n)}>{n} {n === 1 ? 'bathroom' : 'bathrooms'}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="rw-field-row">
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
            onChange={(e) => handleFieldChange('dateAvailable', e.target.value)}
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

      <Field label="Apartment amenities" hint="Select everything that applies — optional but helps you get better matches">
        <div className="rw-amenity-grid">
          {AMENITY_OPTIONS.map((amenity) => {
            const isSelected = data.amenities.includes(amenity.value);
            return (
              <button
                key={amenity.value}
                type="button"
                className={`rw-amenity-btn ${isSelected ? 'is-active' : ''}`}
                onClick={() => {
                  const next = isSelected
                    ? data.amenities.filter((value) => value !== amenity.value)
                    : [...data.amenities, amenity.value];
                  onChange('amenities', next);
                }}
                aria-pressed={isSelected}
              >
                <span aria-hidden="true">{amenity.icon}</span>
                <span>{amenity.label}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        label="About the apartment"
        required
        hint="Describe the vibe — student apartment, WFH-friendly, Shabbat observant, quiet building, etc."
        error={errors.description}
      >
        <textarea
          className={`rw-textarea ${errors.description ? 'rw-input--error' : ''}`}
          placeholder="We're a young professional couple looking for a third roommate. The apartment is bright, has a big balcony, and is 5 minutes from the beach..."
          rows={4}
          maxLength={300}
          value={data.description}
          onChange={(e) => handleFieldChange('description', e.target.value)}
        />
        <p className="rw-char-count">
          {data.description.length}/300
          {data.description.trim().length < MIN_DESCRIPTION_LENGTH && (
            <span> — minimum {MIN_DESCRIPTION_LENGTH} characters</span>
          )}
        </p>
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
              {data.photoFiles.length + 1}/{MAX_PHOTOS}
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

          {data.description && (
            <p className="rw-preview-description">{data.description}</p>
          )}

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
        loadingLabel={publishStage || (uploadingPhotos ? 'Uploading photos...' : 'Publishing...')}
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
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishStage, setPublishStage] = useState('');

  const onChange = useCallback((field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const nextStep = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS)), []);
  const prevStep = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  // Render's free tier spins the backend down after ~15 min of inactivity.
  // The first request after idle time can time out or get dropped before
  // the server finishes waking up. Retrying silently means the user almost
  // never sees a failure that would have resolved itself in a few seconds.
  const retryWithBackoff = async (fn, { retries = 2, delayMs = 2000 } = {}) => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        const isLastAttempt = attempt === retries;
        if (isLastAttempt) throw err;
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
      // Upload selected photos to Cloudinary first — payload needs the
      // resulting URLs, not the local File objects.
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
            photoUploadWarning = 'All photos failed to upload. Publishing without photos — you can add them later by editing your listing.';
          }
        } catch (uploadErr) {
          // eslint-disable-next-line no-console
          console.error('[RoommateWizard] Unexpected photo upload error:', uploadErr);
          photoUploadWarning = 'Photos failed to upload. Publishing without them — you can add photos later.';
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
            ? { lat: data.lat, lng: data.lng }
            : {}),
        },
        // Lets the backend log when listers are typing cities outside
        // israelLocations.js's 20-city coverage, so the list can grow based
        // on real demand instead of guessing. Computed here rather than
        // duplicating findCityEntry's matching logic server-side.
        cityMatchedKnownList: Boolean(findCityEntry(data.city)),
        rentShare: Number(data.rentShare),
        utilitiesEstimate: sumUtilities(data),
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

      // Success — surface any photo upload warning before the wizard
      // unmounts and navigates away, since there's no other UI left
      // to display it once we leave this screen.
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
            uploadingPhotos={uploadingPhotos}
            publishStage={publishStage}
            error={publishError}
          />
        )}
      </div>
    </div>
  );
};

export default RoommateWizard;
