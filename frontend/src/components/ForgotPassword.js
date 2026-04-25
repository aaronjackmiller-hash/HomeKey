import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await requestPasswordReset({ email: email.trim() });
      setMessage(response.message || 'If that email exists, recovery steps are ready.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Forgot Password</h2>
      <p className="auth-help-text">
        Enter your email and we will generate a password reset link.
      </p>
      {error && <p className="status-message status-message-error">{error}</p>}
      {message && <p className="status-message">{message}</p>}
      <form onSubmit={handleSubmit}>
        <div className="input-field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Generating…' : 'Generate Reset Link'}</button>
      </form>
      {message && (
        <p className="auth-help-text">
          Continue to <Link to="/reset-password">Reset Password</Link>.
        </p>
      )}
      <p>Remembered your password? <Link to="/login">Sign In</Link></p>
    </div>
  );
};

export default ForgotPassword;
