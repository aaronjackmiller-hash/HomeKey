import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyAccount, updateMyAccount } from '../services/api';
import { useAuth } from '../context/AuthContext';

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
    whatsapp: String(normalizedAccount.whatsapp || ''),
    moveInDate: toDateInputValue(normalizedAccount.moveInDate),
    preferredContactMethod: ['email', 'whatsapp', 'phone'].includes(String(normalizedAccount.preferredContactMethod || '').toLowerCase())
      ? String(normalizedAccount.preferredContactMethod).toLowerCase()
      : 'email',
  };
};

const MyAccount = () => {
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
    try {
      const payload = {
        name: form.name.trim(),
        phone: normalizeContactNumber(form.phone),
        whatsapp: normalizeContactNumber(form.whatsapp),
        moveInDate: form.moveInDate || '',
        preferredContactMethod: form.preferredContactMethod,
      };
      const response = await updateMyAccount(payload);
      const updatedAccount = response?.data && typeof response.data === 'object' ? response.data : {};
      setForm(toFormState(updatedAccount));
      updateUserProfile(updatedAccount);
      setStatus('Your account details were saved.');
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.map((item) => item.msg).join(', '));
      } else {
        setError(err.response?.data?.message || 'Failed to save account details.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="form-container">
        <h2>My Account</h2>
        <p>Loading your account details...</p>
      </div>
    );
  }

  return (
    <div className="form-container">
      <h2>My Account</h2>
      <p>Update your profile and contact preferences.</p>
      {status && <p style={{ color: 'green' }}>{status}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="input-field">
          <label>Full Name</label>
          <input type="text" name="name" value={form.name} onChange={handleChange} required disabled={saving} />
        </div>
        <div className="input-field">
          <label>Email</label>
          <input type="email" name="email" value={form.email} readOnly disabled />
        </div>
        <div className="input-field">
          <label>Phone (optional)</label>
          <input type="tel" name="phone" value={form.phone} onChange={handleChange} disabled={saving} />
        </div>
        <div className="input-field">
          <label>WhatsApp (optional)</label>
          <input type="tel" name="whatsapp" value={form.whatsapp} onChange={handleChange} disabled={saving} />
        </div>
        <div className="input-field">
          <label>Move-in Date (optional)</label>
          <input
            type="date"
            name="moveInDate"
            value={form.moveInDate}
            onChange={handleMoveInDateChange}
            onInput={handleMoveInDateChange}
            max="2100-12-31"
            disabled={saving}
          />
        </div>
        <div className="input-field">
          <label>Preferred Contact Method</label>
          <select
            name="preferredContactMethod"
            value={form.preferredContactMethod}
            onChange={handleChange}
            disabled={saving}
          >
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Phone</option>
          </select>
        </div>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
      </form>
      <p><Link to="/">Back to homepage</Link></p>
    </div>
  );
};

export default MyAccount;
