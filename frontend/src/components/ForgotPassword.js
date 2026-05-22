import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../services/api';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [humanVerified, setHumanVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestedEmail, setRequestedEmail] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!humanVerified) {
      setError('Please verify that you are not a robot.');
      return;
    }
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      await requestPasswordReset({ email: normalizedEmail });
      setRequestedEmail(normalizedEmail);
      setRequestSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      {!requestSubmitted ? (
        <div className="forgot-password-card">
          <h2>Forgot your password?</h2>
          <p className="auth-help-text">
            Please enter your email address and we will send you a link to change your password.
          </p>
          {error && <p className="status-message status-message-error">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="input-field">
              <label>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <label className="mock-captcha" htmlFor="forgot-password-human-check">
              <input
                id="forgot-password-human-check"
                type="checkbox"
                checked={humanVerified}
                onChange={(event) => setHumanVerified(event.target.checked)}
              />
              <span>I&apos;m not a robot</span>
              <strong aria-hidden="true">reCAPTCHA</strong>
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Continue'}
            </button>
          </form>
          <p className="forgot-password-footer-link">
            Know your password? <Link to="/login">Sign in now.</Link>
          </p>
        </div>
      ) : (
        <div className="forgot-password-card forgot-password-success-card">
          <h2>Request received</h2>
          <p className="auth-help-text">
            An email has been sent with a link to reset your password.
          </p>
          <p className="auth-help-text forgot-password-email-line">
            Email sent to: <strong>{requestedEmail}</strong>
          </p>
          <p className="forgot-password-footer-link">
            Know your password? <Link to="/login">Sign in now.</Link>
          </p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setRequestSubmitted(false);
              setHumanVerified(false);
              setError('');
            }}
          >
            Send again
          </button>
        </div>
      )}
    </div>
  );
};

export default ForgotPassword;
