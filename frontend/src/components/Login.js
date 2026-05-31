import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, Link, useLocation } from 'react-router-dom';
import {
  getPasskeyAuthenticationOptions,
  getPasskeyRegistrationOptions,
  getOAuthConfig,
  loginUser,
  loginWithApple,
  loginWithGoogle,
  verifyPasskeyAuthentication,
  verifyPasskeyRegistration,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { startAuthentication, startRegistration } from '../utils/webauthn';
import PasswordField from './PasswordField';

const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';
const APPLE_IDENTITY_SCRIPT = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
const SAVE_SEARCH_AUTH_INTENT = 'save-search';
const SAVE_SEARCH_AFTER_AUTH_SESSION_KEY = 'homekey:save-search-after-auth';
const REMEMBERED_LOGIN_EMAIL_STORAGE_KEY = 'homekey:remembered-login-email';
const STALE_DEMO_LOGIN_EMAILS = new Set([
  'agent@homekey.demo',
  'avi.cohen@homekey-demo.il',
]);
let oauthConfigPromise;

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const isStaleDemoLoginEmail = (value) => STALE_DEMO_LOGIN_EMAILS.has(normalizeEmail(value));

const getRememberedLoginEmail = () => {
  if (typeof window === 'undefined') return '';
  const rememberedEmail = String(window.localStorage.getItem(REMEMBERED_LOGIN_EMAIL_STORAGE_KEY) || '').trim();
  if (isStaleDemoLoginEmail(rememberedEmail)) {
    window.localStorage.removeItem(REMEMBERED_LOGIN_EMAIL_STORAGE_KEY);
    return '';
  }
  return rememberedEmail;
};

const resolveSafeRedirectPath = (rawValue) => {
  const fallback = '/';
  const candidate = String(rawValue || '').trim();
  if (!candidate) return fallback;
  if (!candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//')) return fallback;
  return candidate;
};

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

const loadOAuthConfig = async () => {
  if (!oauthConfigPromise) {
    oauthConfigPromise = getOAuthConfig().catch((err) => {
      oauthConfigPromise = undefined;
      throw err;
    });
  }
  return oauthConfigPromise;
};

const resolveGoogleClientId = async () => {
  const envClientId = String(process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();
  if (envClientId) return envClientId;
  try {
    const config = await loadOAuthConfig();
    return String(config?.data?.googleClientId || '').trim();
  } catch (_err) {
    return '';
  }
};

const supportsWebAuthn = () => (
  typeof window !== 'undefined' &&
  typeof window.PublicKeyCredential !== 'undefined'
);

const Login = () => {
  const { login } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const rememberedEmailOnLoad = getRememberedLoginEmail();
  const [form, setForm] = useState(() => ({ email: rememberedEmailOnLoad, password: '' }));
  const [socialLoading, setSocialLoading] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [enablePasskey, setEnablePasskey] = useState(false);
  const [rememberUsername, setRememberUsername] = useState(() => rememberedEmailOnLoad.length > 0);
  const [passkeySetupStep, setPasskeySetupStep] = useState('');
  const passkeySetupOpen = passkeySetupStep.length > 0;
  const authDestination = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const intent = String(params.get('intent') || '').trim().toLowerCase();
    const redirect = resolveSafeRedirectPath(params.get('redirect'));
    return {
      intent,
      redirectPath: redirect,
      isSaveSearchIntent: intent === SAVE_SEARCH_AUTH_INTENT,
    };
  }, [location.search]);
  const registerRoute = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const serialized = params.toString();
    return {
      pathname: '/register',
      search: serialized ? `?${serialized}` : '',
    };
  }, [location.search]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  useEffect(() => {
    if (typeof window === 'undefined' || rememberUsername) return;
    window.localStorage.removeItem(REMEMBERED_LOGIN_EMAIL_STORAGE_KEY);
  }, [rememberUsername]);

  const rememberAuthenticatedEmail = (email) => {
    if (typeof window === 'undefined') return;
    const normalizedEmail = String(email || '').trim();
    if (rememberUsername && normalizedEmail && !isStaleDemoLoginEmail(normalizedEmail)) {
      window.localStorage.setItem(REMEMBERED_LOGIN_EMAIL_STORAGE_KEY, normalizedEmail);
      return;
    }
    window.localStorage.removeItem(REMEMBERED_LOGIN_EMAIL_STORAGE_KEY);
  };

  const finishAuthAndRedirect = () => {
    if (typeof window !== 'undefined' && authDestination.isSaveSearchIntent) {
      window.sessionStorage.setItem(SAVE_SEARCH_AFTER_AUTH_SESSION_KEY, '1');
    }
    history.push(authDestination.redirectPath);
  };

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

  const loginWithPassword = async () => {
    const data = await loginUser(form);
    rememberAuthenticatedEmail(form.email);
    login(data);
    return data;
  };

  const closePasskeySetup = () => {
    setPasskeySetupStep('');
    setEnablePasskey(false);
  };

  const handleSkipPasskeySetup = () => {
    closePasskeySetup();
    finishAuthAndRedirect();
  };

  const handleCreatePasskeyNow = async () => {
    setError('');
    setNotice('');
    setSocialLoading('passkey-setup');
    let didRedirect = false;
    try {
      const enrollment = await maybeEnrollPasskey({ force: true });
      closePasskeySetup();
      if (enrollment.message) {
        setNotice(enrollment.message);
      }
      finishAuthAndRedirect();
      didRedirect = true;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Passkey setup failed.';
      setError(msg);
    } finally {
      if (!didRedirect) {
        setSocialLoading('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    let didRedirect = false;
    try {
      await loginWithPassword();
      if (enablePasskey && supportsWebAuthn()) {
        setNotice('Choose whether to add a passkey now. This step can be skipped.');
        setPasskeySetupStep('method');
        return;
      }
      finishAuthAndRedirect();
      didRedirect = true;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setError(msg);
    } finally {
      if (!didRedirect) {
        setLoading(false);
      }
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
    let didRedirect = false;
    try {
      const optionsResponse = await getPasskeyAuthenticationOptions(form.email.trim());
      const credential = await startAuthentication({ optionsJSON: optionsResponse.options });
      const data = await verifyPasskeyAuthentication({
        email: form.email.trim(),
        credential,
      });
      rememberAuthenticatedEmail(form.email);
      login(data);
      finishAuthAndRedirect();
      didRedirect = true;
    } catch (err) {
      const status = Number(err.response?.status || 0);
      const apiMessage = String(err.response?.data?.message || '').trim();
      if (status === 404 && /No passkey is registered for this account\./i.test(apiMessage)) {
        if (!form.password.trim()) {
          setError('No passkey is registered yet. Enter your password and sign in once to save a passkey.');
          return;
        }
        try {
          await loginWithPassword();
          setNotice('No passkey was found. Choose whether to create one now, or skip.');
          setPasskeySetupStep('method');
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
      if (!didRedirect) {
        setSocialLoading('');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    const googleClientId = await resolveGoogleClientId();
    if (!googleClientId) {
      setError('Google sign-in is not configured. Set GOOGLE_CLIENT_ID (backend) or REACT_APP_GOOGLE_CLIENT_ID (frontend).');
      return;
    }
    setError('');
    setNotice('');
    setSocialLoading('google');
    let didRedirect = false;
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
      finishAuthAndRedirect();
      didRedirect = true;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Google sign-in failed.';
      setError(msg);
    } finally {
      if (!didRedirect) {
        setSocialLoading('');
      }
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
    let didRedirect = false;
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
      finishAuthAndRedirect();
      didRedirect = true;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Apple sign-in failed.';
      setError(msg);
    } finally {
      if (!didRedirect) {
        setSocialLoading('');
      }
    }
  };

  const formDisabled = loading || socialLoading.length > 0 || passkeySetupOpen;
  const canUsePasskeys = supportsWebAuthn();

  return (
    <div className="auth-signin-page">
      <div className="form-container auth-signin-card">
        <div className="auth-signin-header">
          <h2>Sign In</h2>
          {authDestination.isSaveSearchIntent && (
            <p className="auth-signin-intent">Sign in to save this search. We&apos;ll save it right after you sign in.</p>
          )}
          <p className="auth-signin-subtext">Or, create an account to save listings and contact preferences.</p>
        </div>
        {error && <p className="auth-feedback auth-feedback--error">{error}</p>}
        {notice && <p className="auth-feedback auth-feedback--notice">{notice}</p>}
        <form className="auth-signin-form" onSubmit={handleSubmit}>
          <div className="input-field">
            <label htmlFor="signin-email">Email</label>
            <input
              id="signin-email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
              disabled={formDisabled}
            />
          </div>
          <PasswordField
            label="Password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            disabled={formDisabled}
            autoComplete="current-password"
          />
          <div className="auth-form-options">
            <label className="auth-remember-row" htmlFor="remember-username">
              <input
                id="remember-username"
                type="checkbox"
                checked={rememberUsername}
                onChange={(event) => {
                  const nextChecked = event.target.checked;
                  setRememberUsername(nextChecked);
                }}
                disabled={formDisabled}
              />
              <span>Remember my email</span>
            </label>
            <Link to="/forgot-password" className="auth-forgot-link">Forgot password?</Link>
          </div>
          <button type="submit" className="auth-submit-btn" disabled={formDisabled}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
          <label className="auth-passkey-row" htmlFor="enable-passkey-login">
            <input
              id="enable-passkey-login"
              type="checkbox"
              checked={enablePasskey}
              onChange={(event) => setEnablePasskey(event.target.checked)}
              disabled={!canUsePasskeys || formDisabled}
            />
            <span>Sign in faster next time with a passkey</span>
          </label>
          <button
            className="secondary-button auth-passkey-action"
            type="button"
            onClick={handlePasskeySignIn}
            disabled={formDisabled}
          >
            {socialLoading === 'passkey' ? 'Checking passkey…' : 'Sign In with Passkey'}
          </button>
          {passkeySetupOpen && (
            <div className="auth-passkey-template" role="dialog" aria-live="polite" aria-label="Passkey setup steps">
              {passkeySetupStep === 'method' ? (
                <>
                  <p className="auth-passkey-template__step">Step 1: Choose authentication method</p>
                  <h3>Secure your account</h3>
                  <button
                    type="button"
                    className="auth-passkey-template__option"
                    onClick={() => setPasskeySetupStep('create')}
                    disabled={socialLoading.length > 0}
                  >
                    <strong>Passkey</strong>
                    <span>Verify your identity the same way you unlock your device.</span>
                  </button>
                  <p className="auth-passkey-template__coming-soon">SMS and authenticator app options are coming soon.</p>
                  <button
                    type="button"
                    className="auth-passkey-template__skip"
                    onClick={handleSkipPasskeySetup}
                    disabled={socialLoading.length > 0}
                  >
                    Skip for now
                  </button>
                </>
              ) : (
                <>
                  <p className="auth-passkey-template__step">Step 2: Create a passkey</p>
                  <h3>Create a passkey</h3>
                  <p className="auth-passkey-template__copy">
                    Add a passkey for faster, password-free sign-in using your device&apos;s built-in security.
                  </p>
                  <ul className="auth-passkey-template__benefits">
                    <li><strong>Seamless:</strong> Sign in with just a look or touch.</li>
                    <li><strong>Phishing-resistant:</strong> Passkeys cannot be stolen or reused by attackers.</li>
                    <li><strong>Private:</strong> Biometrics and PINs stay on your device.</li>
                  </ul>
                  <div className="auth-passkey-template__actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handleCreatePasskeyNow}
                      disabled={socialLoading.length > 0}
                    >
                      {socialLoading === 'passkey-setup' ? 'Opening prompt…' : 'Next'}
                    </button>
                    <button
                      type="button"
                      className="auth-passkey-template__skip"
                      onClick={handleSkipPasskeySetup}
                      disabled={socialLoading.length > 0}
                    >
                      Skip
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </form>
        <div className="auth-divider" aria-hidden="true"><span>or</span></div>
        <div className="auth-social-buttons">
          <button
            type="button"
            className="auth-oauth-btn"
            onClick={handleGoogleSignIn}
            disabled={formDisabled}
          >
            <span className="auth-oauth-icon auth-oauth-icon--google" aria-hidden="true">G</span>
            {socialLoading === 'google' ? 'Connecting Google…' : 'Continue with Google'}
          </button>
          <button
            type="button"
            className="auth-oauth-btn"
            onClick={handleAppleSignIn}
            disabled={formDisabled}
          >
            <span className="auth-oauth-icon auth-oauth-icon--apple" aria-hidden="true"></span>
            {socialLoading === 'apple' ? 'Connecting Apple…' : 'Continue with Apple'}
          </button>
        </div>
        <p className="auth-footer-text">
          Don&apos;t have an account? <Link to={registerRoute}>Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
