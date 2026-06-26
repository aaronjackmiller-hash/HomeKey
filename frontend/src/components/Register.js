/**
 * Register.js
 * path: frontend/src/components/Register.js
 *
 * Streamlined registration — first name, email, phone, password only.
 * No last name, no move-in date, no role, no preferred contact method.
 * Phone = WhatsApp in Israel, so one field covers both.
 */
import React, { useMemo, useState } from 'react';
import { useHistory, Link, useLocation } from 'react-router-dom';
import { registerUser } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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

const Register = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const history = useHistory();
  const location = useLocation();

  const [form, setForm] = useState({
    firstName: '',
    email: '',
    password: '',
    phone: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        name: form.firstName.trim(),
        email: form.email,
        password: form.password,
        phone: form.phone,
        preferredContactMethod: 'phone',
        role: 'buyer',
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
      <h2>{t('register.title')}</h2>
      {authDestination.isSaveSearchIntent && (
        <p className="auth-help-text">{t('register.saveSearchHint')}</p>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="input-field">
          <label>{t('register.firstName') || 'First name'}</label>
          <input
            type="text"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            placeholder="Your first name"
            required
          />
        </div>
        <div className="input-field">
          <label>{t('register.email') || 'Email'}</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="input-field">
          <label>{t('register.mobilePhoneRequired') || 'Phone / WhatsApp'}</label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="05X XXX XXXX"
            autoComplete="tel"
            required
          />
        </div>
        <PasswordField
          label={t('register.password') || 'Password'}
          name="password"
          value={form.password}
          onChange={handleChange}
          required
          minLength={6}
          disabled={loading}
          autoComplete="new-password"
        />
        <button type="submit" disabled={loading}>
          {loading ? (t('register.creatingAccount') || 'Creating account…') : (t('register.registerButton') || 'Create account')}
        </button>
      </form>
      <p>
        {t('register.alreadyHaveAccount') || 'Already have an account?'}{' '}
        <Link to={loginRoute}>{t('register.signIn') || 'Sign in'}</Link>
      </p>
    </div>
  );
};

export default Register;
