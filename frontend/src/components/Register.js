import React, { useMemo, useState } from 'react';
import { useHistory, Link, useLocation } from 'react-router-dom';
import { registerUser } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PasswordField from './PasswordField';

const SAVE_SEARCH_AUTH_INTENT = 'save-search';
const SAVE_SEARCH_AFTER_AUTH_SESSION_KEY = 'homekey:save-search-after-auth';

const resolveSafeRedirectPath = (rawValue) => {
  const fallback = '/';
  const candidate = String(rawValue || '').trim();
  if (!candidate) return fallback;
  if (!candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//')) return fallback;
  return candidate;
};

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

const Register = () => {
  const { login } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    moveInDate: '',
    preferredContactMethod: 'email',
    role: 'buyer',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const authDestination = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const intent = String(params.get('intent') || '').trim().toLowerCase();
    return {
      isSaveSearchIntent: intent === SAVE_SEARCH_AUTH_INTENT,
      redirectPath: resolveSafeRedirectPath(params.get('redirect')),
    };
  }, [location.search]);
  const loginRoute = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const serialized = params.toString();
    return {
      pathname: '/login',
      search: serialized ? `?${serialized}` : '',
    };
  }, [location.search]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (!name) return;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMoveInDateChange = (e) => {
    const normalizedDate = normalizeDateInputValue(e.target, e.target.value);
    setForm((prev) => ({ ...prev, moveInDate: normalizedDate }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        moveInDate: form.moveInDate || undefined,
      };
      const data = await registerUser(payload);
      login(data);
      if (typeof window !== 'undefined' && authDestination.isSaveSearchIntent) {
        window.sessionStorage.setItem(SAVE_SEARCH_AFTER_AUTH_SESSION_KEY, '1');
      }
      history.push(authDestination.redirectPath);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        setError(apiErrors.map((e) => e.msg).join(', '));
      } else {
        setError(err.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Create Account</h2>
      {authDestination.isSaveSearchIntent && (
        <p className="auth-help-text">Create your account to save this search. We&apos;ll save it right after signup.</p>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="input-field">
          <label>Full Name</label>
          <input type="text" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div className="input-field">
          <label>Email</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} required />
        </div>
        <PasswordField
          label="Password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
          minLength={6}
          disabled={loading}
          autoComplete="new-password"
        />
        <div className="input-field">
          <label>Phone (optional)</label>
          <input type="tel" name="phone" value={form.phone} onChange={handleChange} />
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
          />
        </div>
        <div className="input-field">
          <label>Preferred Contact Method</label>
          <select name="preferredContactMethod" value={form.preferredContactMethod} onChange={handleChange}>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Phone</option>
          </select>
        </div>
        <div className="input-field">
          <label>Role</label>
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="agent">Agent</option>
          </select>
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Register'}</button>
      </form>
      <p>Already have an account? <Link to={loginRoute}>Sign In</Link></p>
    </div>
  );
};

export default Register;
