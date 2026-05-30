import React, { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { getMyAccount, updateMyAccount } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CONTACT_METHOD_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'sms', label: 'SMS' },
];

const normalizePreferredContactMethod = (rawValue) => {
  const normalized = String(rawValue || '').trim().toLowerCase();
  if (normalized === 'whatsapp') return 'sms';
  return CONTACT_METHOD_OPTIONS.some((option) => option.value === normalized)
    ? normalized
    : 'email';
};

const toDateInputValue = (rawValue) => {
  if (!rawValue) return '';
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const normalizeContactNumber = (rawValue) => String(rawValue || '').trim().replace(/[^\d+]/g, '');

const normalizeDateInputValue = (inputElement, rawValue) => {
  const value = String(rawValue || '').trim();
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const candidateDate = inputElement?.valueAsDate instanceof Date
    ? inputElement.valueAsDate
    : new Date(value);
  if (Number.isNaN(candidateDate.getTime())) return '';
  const year = candidateDate.getFullYear();
  const month = String(candidateDate.getMonth() + 1).padStart(2, '0');
  const day = String(candidateDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toFormState = (account) => {
  const normalizedAccount = account && typeof account === 'object' ? account : {};
  return {
    name: String(normalizedAccount.name || ''),
    email: String(normalizedAccount.email || ''),
    phone: String(normalizedAccount.phone || ''),
    moveInDate: toDateInputValue(normalizedAccount.moveInDate),
    preferredContactMethod: normalizePreferredContactMethod(normalizedAccount.preferredContactMethod),
  };
};

const MyAccount = () => {
  const history = useHistory();
  const { user, updateUserProfile } = useAuth();
  const [form, setForm] = useState(toFormState(user));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadAccount = async () => {
      try {
        const response = await getMyAccount();
        if (cancelled) return;
        const accountData = response?.data && typeof response.data === 'object' ? response.data : {};
        setForm(toFormState(accountData));
        updateUserProfile(accountData);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || 'Failed to load account details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadAccount();
    return () => {
      cancelled = true;
    };
  }, [updateUserProfile]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMoveInDateChange = (event) => {
    const normalizedDate = normalizeDateInputValue(event.target, event.target.value);
    setForm((prev) => ({ ...prev, moveInDate: normalizedDate }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    setError('');
    let shouldResetSaving = true;
    try {
      const payload = {
        name: form.name.trim(),
        phone: normalizeContactNumber(form.phone),
        moveInDate: form.moveInDate || '',
        preferredContactMethod: form.preferredContactMethod,
      };
      const response = await updateMyAccount(payload);
      const updatedAccount = response?.data && typeof response.data === 'object' ? response.data : {};
      setForm(toFormState(updatedAccount));
      updateUserProfile(updatedAccount);
      shouldResetSaving = false;
      setSaving(false);
      history.push('/');
      return;
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.map((item) => item.msg).join(', '));
      } else {
        setError(err.response?.data?.message || 'Failed to save account details.');
      }
    } finally {
      if (shouldResetSaving) setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="account-page">
        <div className="account-container account-container--loading">
          <div className="account-header">
            <h1>My Account</h1>
            <p>Loading your account details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="account-container">
        <div className="account-header">
          <h1>My Account</h1>
          <p>Update your profile and contact preferences.</p>

          <div className="account-alerts" aria-live="polite">
            {status && (
              <div className="account-alert account-alert--success">
                <svg className="account-alert__icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <path d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm3.72-9.53a.75.75 0 0 0-1.06-1.06L9 11.07 7.34 9.41a.75.75 0 1 0-1.06 1.06l2.19 2.19c.29.29.77.29 1.06 0l4.19-4.19Z" />
                </svg>
                {status}
              </div>
            )}
            {error && (
              <div className="account-alert account-alert--error" role="alert">
                {error}
              </div>
            )}
          </div>
        </div>

        <form className="account-form" onSubmit={handleSubmit}>
          <div className="account-form-grid">
            <div className="account-form-group">
              <label htmlFor="account-name">1. Full Name</label>
              <div className="account-input-wrapper">
                <input
                  id="account-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
              </div>
            </div>

            <div className="account-form-group">
              <label htmlFor="account-email">2. Email</label>
              <div className="account-input-wrapper">
                <input id="account-email" type="email" name="email" value={form.email} readOnly disabled />
              </div>
            </div>

            <div className="account-form-group">
              <label htmlFor="account-phone">3. Phone <span>(optional)</span></label>
              <div className="account-input-wrapper account-input-wrapper--icon">
                <svg className="account-input-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <path d="M5.45 2.5c.34-.07.69.1.85.41l1.18 2.35c.13.26.1.57-.08.8l-.99 1.24a10.45 10.45 0 0 0 6.29 6.29l1.24-.99c.23-.18.54-.21.8-.08l2.35 1.18c.31.16.48.51.41.85l-.52 2.6c-.07.38-.41.65-.8.65C8.46 17.8 2.2 11.54 2.2 3.82c0-.39.27-.73.65-.8l2.6-.52Z" />
                </svg>
                <input
                  id="account-phone"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="account-form-group">
              <label htmlFor="account-move-in-date">4. Move-in Date <span>(optional)</span></label>
              <div className="account-input-wrapper">
                <input
                  id="account-move-in-date"
                  type="date"
                  name="moveInDate"
                  value={form.moveInDate}
                  onChange={handleMoveInDateChange}
                  onInput={handleMoveInDateChange}
                  max="2100-12-31"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="account-form-group account-form-group--full">
              <label htmlFor="account-contact-method">5. Preferred Contact Method</label>
              <div className="account-input-wrapper account-input-wrapper--select">
                <select
                  id="account-contact-method"
                  name="preferredContactMethod"
                  value={form.preferredContactMethod}
                  onChange={handleChange}
                  disabled={saving}
                >
                  {CONTACT_METHOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="account-form-actions">
            <button type="submit" className="account-save-button" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link to="/" className="account-back-link">Back to homepage</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MyAccount;
