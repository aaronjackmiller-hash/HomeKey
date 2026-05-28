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

const getRegistrationRoleValue = (roleSelection) => {
  const normalized = String(roleSelection || '').trim().toLowerCase();
  if (normalized === 'rental-manager') return 'agent';
  return 'buyer';
};

const Register = () => {
  const { login } = useAuth();
  const { t, language } = useLanguage();
  const history = useHistory();
  const location = useLocation();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    moveInDate: '',
    preferredContactMethod: 'phone',
    role: 'renter',
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
      const fullName = [form.firstName, form.lastName]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .join(' ')
        .trim();
      const payload = {
        name: fullName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        moveInDate: form.moveInDate || undefined,
        preferredContactMethod: form.preferredContactMethod,
        role: getRegistrationRoleValue(form.role),
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

  const showMissingPhoneNotice = form.preferredContactMethod === 'phone' && !String(form.phone || '').trim();
  const isHebrew = language === 'he';

  return (
    <div className="form-container">
      <h2>{t('register.title')}</h2>
      {authDestination.isSaveSearchIntent && (
        <p className="auth-help-text">{t('register.saveSearchHint')}</p>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="register-name-grid">
          <div className="input-field">
            <label>{t('register.firstName')}</label>
            <input type="text" name="firstName" value={form.firstName} onChange={handleChange} required />
          </div>
          <div className="input-field">
            <label>{t('register.lastName')}</label>
            <input type="text" name="lastName" value={form.lastName} onChange={handleChange} required />
          </div>
        </div>
        <div className="input-field">
          <label>{t('register.email')}</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} required />
        </div>
        <PasswordField
          label={t('register.password')}
          name="password"
          value={form.password}
          onChange={handleChange}
          required
          minLength={6}
          disabled={loading}
          autoComplete="new-password"
        />
        <div className="input-field">
          <label>{t('register.mobilePhoneOptional')}</label>
          <input type="tel" name="phone" value={form.phone} onChange={handleChange} />
        </div>
        <div className="input-field">
          <label>{t('register.moveInDateOptional')}</label>
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
          <label>{t('register.preferredContactMethod')}</label>
          <select name="preferredContactMethod" value={form.preferredContactMethod} onChange={handleChange}>
            <option value="phone">{t('register.mobilePhoneOption')}</option>
            <option value="email">{t('register.emailOption')}</option>
          </select>
        </div>
        {showMissingPhoneNotice && (
          <p className={`form-helper-text ${isHebrew ? 'form-helper-text--rtl' : ''}`}>
            {t('register.missingMobilePhoneNotice')}
          </p>
        )}
        <div className="input-field">
          <label>{t('register.role')}</label>
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="renter">{t('register.renterRoleOption')}</option>
            <option value="rental-manager">{t('register.rentalManagerRoleOption')}</option>
          </select>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? t('register.creatingAccount') : t('register.registerButton')}
        </button>
      </form>
      <p>
        {t('register.alreadyHaveAccount')} <Link to={loginRoute}>{t('register.signIn')}</Link>
      </p>
    </div>
  );
};

export default Register;
