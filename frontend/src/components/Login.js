import React, { useState } from 'react';
import { useHistory, Link } from 'react-router-dom';
import {
  getPasskeyAuthenticationOptions,
  getPasskeyRegistrationOptions,
  loginUser,
  loginWithApple,
  loginWithGoogle,
  verifyPasskeyAuthentication,
  verifyPasskeyRegistration,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { startAuthentication, startRegistration } from '../utils/webauthn';

const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';
const APPLE_IDENTITY_SCRIPT = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

const loadExternalScript = (src, id) => new Promise((resolve, reject) => {
  if (document.getElementById(id)) {
    resolve();
    return;
  }
  const script = document.createElement('script');
  script.id = id;
  script.src = src;
  script.async = true;
  script.onload = () => resolve();
  script.onerror = () => reject(new Error(`Failed to load ${src}`));
  document.head.appendChild(script);
});

const supportsWebAuthn = () => (
  typeof window !== 'undefined' &&
  typeof window.PublicKeyCredential !== 'undefined'
);

const Login = () => {
  const { login } = useAuth();
  const history = useHistory();
  const [form, setForm] = useState({ email: '', password: '' });
  const [socialLoading, setSocialLoading] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [enablePasskey, setEnablePasskey] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const maybeEnrollPasskey = async ({ force = false } = {}) => {
    if ((!enablePasskey && !force) || !supportsWebAuthn()) {
      return { attempted: false, success: false, message: '' };
    }
    try {
      const optionsResponse = await getPasskeyRegistrationOptions();
      const credential = await startRegistration({ optionsJSON: optionsResponse.options });
      await verifyPasskeyRegistration(credential);
      return {
        attempted: true,
        success: true,
        message: 'Passkey saved. You can use passkey sign-in next time.',
      };
    } catch (err) {
      const browserMessage = String(err?.message || '').trim();
      const isUserCancelled = (
        err?.name === 'NotAllowedError'
        || err?.name === 'AbortError'
        || /cancel|aborted|not allowed|denied/i.test(browserMessage)
      );
      return {
        attempted: true,
        success: false,
        message: isUserCancelled
          ? 'Signed in. Passkey setup was cancelled before completion.'
          : err.response?.data?.message || browserMessage || 'Signed in. Passkey setup was skipped.',
      };
    }
  };

  const loginWithPassword = async ({ enrollPasskey = false } = {}) => {
    const data = await loginUser(form);
    login(data);
    if (!enrollPasskey) {
      return data;
    }
    const enrollment = await maybeEnrollPasskey({ force: true });
    if (enrollment.message) {
      setNotice(enrollment.message);
    }
    return data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await loginWithPassword({ enrollPasskey: enablePasskey });
      history.push('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeySignIn = async () => {
    if (!supportsWebAuthn()) {
      setError('Passkeys are not supported in this browser.');
      return;
    }
    if (!form.email.trim()) {
      setError('Enter your email before using passkey sign-in.');
      return;
    }
    setError('');
    setNotice('');
    setSocialLoading('passkey');
    try {
      const optionsResponse = await getPasskeyAuthenticationOptions(form.email.trim());
      const credential = await startAuthentication({ optionsJSON: optionsResponse.options });
      const data = await verifyPasskeyAuthentication({
        email: form.email.trim(),
        credential,
      });
      login(data);
      history.push('/');
    } catch (err) {
      const status = Number(err.response?.status || 0);
      const apiMessage = String(err.response?.data?.message || '').trim();
      if (status === 404 && /No passkey is registered for this account\./i.test(apiMessage)) {
        if (!form.password.trim()) {
          setError('No passkey is registered yet. Enter your password and sign in once to save a passkey.');
          return;
        }
        try {
          setNotice('No passkey was found. We are signing you in with password so you can save one now.');
          await loginWithPassword({ enrollPasskey: true });
          history.push('/');
          return;
        } catch (fallbackErr) {
          const fallbackMsg = fallbackErr.response?.data?.message || 'Could not sign in with password to set up a passkey.';
          setError(fallbackMsg);
          return;
        }
      }
      const msg = err.response?.data?.message || err.message || 'Passkey sign-in failed. Try email + password.';
      setError(msg);
    } finally {
      setSocialLoading('');
    }
  };

  const handleGoogleSignIn = async () => {
    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      setError('Google sign-in is not configured. Set REACT_APP_GOOGLE_CLIENT_ID.');
      return;
    }
    setError('');
    setNotice('');
    setSocialLoading('google');
    try {
      await loadExternalScript(GOOGLE_IDENTITY_SCRIPT, 'homekey-google-identity');
      if (!window.google?.accounts?.id) {
        throw new Error('Google Identity SDK did not initialize.');
      }

      const credential = await new Promise((resolve, reject) => {
        let settled = false;
        const timeoutId = setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new Error('Google sign-in timed out. Please try again.'));
        }, 30000);

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            if (!response?.credential) {
              reject(new Error('Google did not return an ID token.'));
              return;
            }
            resolve(response.credential);
          },
        });

        window.google.accounts.id.prompt((notification) => {
          if (settled) return;
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            settled = true;
            clearTimeout(timeoutId);
            reject(new Error('Google sign-in prompt was blocked or unavailable.'));
          }
        });
      });

      const data = await loginWithGoogle({ idToken: credential });
      login(data);
      history.push('/');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Google sign-in failed.';
      setError(msg);
    } finally {
      setSocialLoading('');
    }
  };

  const handleAppleSignIn = async () => {
    const appleClientId = process.env.REACT_APP_APPLE_CLIENT_ID;
    const appleRedirectUri = process.env.REACT_APP_APPLE_REDIRECT_URI;
    if (!appleClientId || !appleRedirectUri) {
      setError('Apple sign-in is not configured. Set REACT_APP_APPLE_CLIENT_ID and REACT_APP_APPLE_REDIRECT_URI.');
      return;
    }
    setError('');
    setNotice('');
    setSocialLoading('apple');
    try {
      await loadExternalScript(APPLE_IDENTITY_SCRIPT, 'homekey-apple-identity');
      if (!window.AppleID?.auth) {
        throw new Error('Apple Sign In SDK did not initialize.');
      }

      window.AppleID.auth.init({
        clientId: appleClientId,
        scope: 'name email',
        redirectURI: appleRedirectUri,
        usePopup: true,
      });

      const result = await window.AppleID.auth.signIn();
      const idToken = result?.authorization?.id_token;
      const name = result?.user
        ? `${result.user.name?.firstName || ''} ${result.user.name?.lastName || ''}`.trim()
        : '';
      if (!idToken) {
        throw new Error('Apple sign-in did not return an ID token.');
      }
      const data = await loginWithApple({ idToken, name });
      login(data);
      history.push('/');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Apple sign-in failed.';
      setError(msg);
    } finally {
      setSocialLoading('');
    }
  };

  return (
    <div className="form-container">
      <h2>Sign In</h2>
      <p className="auth-help-text">Or, create an account to save listings and contact preferences.</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {notice && <p style={{ color: '#166534' }}>{notice}</p>}
      <form onSubmit={handleSubmit}>
        <div className="input-field">
          <label>Email</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} required />
        </div>
        <div className="input-field">
          <label>Password</label>
          <input type="password" name="password" value={form.password} onChange={handleChange} required />
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
        <label className="auth-passkey-row" htmlFor="enable-passkey-login">
          <input
            id="enable-passkey-login"
            type="checkbox"
            checked={enablePasskey}
            onChange={(event) => setEnablePasskey(event.target.checked)}
            disabled={!supportsWebAuthn() || loading}
          />
          <span>Sign in faster next time with a passkey</span>
        </label>
        <button
          className="secondary-button auth-passkey-action"
          type="button"
          onClick={handlePasskeySignIn}
          disabled={socialLoading.length > 0}
        >
          {socialLoading === 'passkey' ? 'Checking passkey…' : 'Sign In with Passkey'}
        </button>
      </form>
      <p><Link to="/forgot-password">Forgot password?</Link></p>
      <div className="auth-divider" aria-hidden="true"><span>or</span></div>
      <button
        type="button"
        className="auth-oauth-btn"
        onClick={handleGoogleSignIn}
        disabled={socialLoading.length > 0}
      >
        <span className="auth-oauth-icon" aria-hidden="true">G</span>
        {socialLoading === 'google' ? 'Connecting Google…' : 'Continue with Google'}
      </button>
      <button
        type="button"
        className="auth-oauth-btn"
        onClick={handleAppleSignIn}
        disabled={socialLoading.length > 0}
      >
        <span className="auth-oauth-icon" aria-hidden="true"></span>
        {socialLoading === 'apple' ? 'Connecting Apple…' : 'Continue with Apple'}
      </button>
      <p>Don't have an account? <Link to="/register">Register</Link></p>
    </div>
  );
};

export default Login;
