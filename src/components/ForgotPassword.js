import React, { useState } from 'react';
import axios from 'axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/auth/forgot-password`,
        {
          email: email.trim()
        }
      );

      setMessage(
        response.data?.message || 'Reset OTP has been sent to your email.'
      );
    } catch (error) {
      setError(
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to send reset request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f5f5f5'
      }}
    >
      <div
        style={{
          width: '400px',
          padding: '30px',
          background: '#fff',
          borderRadius: '10px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}
      >
        <h2>Forgot Password</h2>

        <p>
          Enter your email address to reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '15px',
              boxSizing: 'border-box'
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        {message && (
          <p
            style={{
              marginTop: '15px',
              color: 'green'
            }}
          >
            {message}
          </p>
        )}

        {error && (
          <p
            style={{
              marginTop: '15px',
              color: 'red'
            }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;