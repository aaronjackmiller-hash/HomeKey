import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { resetPassword } from '../services/api';

const ResetPassword = () => {
  const history = useHistory();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({
        newPassword: password,
      });
      setSuccess('Password updated successfully. Redirecting to sign in...');
      setTimeout(() => history.push('/login'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Reset Password</h2>
      <p className="auth-help-text">Choose a new password for your account.</p>

      {error && <p className="status-message status-message-error">{error}</p>}
      {success && <p className="status-message">{success}</p>}

      <form onSubmit={handleSubmit}>
        <div className="input-field">
          <label>New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        <div className="input-field">
          <label>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Updating…' : 'Set New Password'}
        </button>
      </form>

      <p>
        Back to <Link to="/login">Sign In</Link>
      </p>
    </div>
  );
};

export default ResetPassword;
