import { useSiteTranslation, translate as tr } from '../../hooks/useSiteTranslation';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';
import './Auth.css';

const Login = () => {
  useSiteTranslation();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check if form is valid
  const isFormValid = () => {
    return (
      formData.email.trim() !== '' &&
      isValidEmail(formData.email) &&
      formData.password.trim() !== '' &&
      formData.password.length >= 6
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate email format
    if (!isValidEmail(formData.email)) {
      toast.error(tr("Please enter a valid email address"));
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      toast.error(tr("Password must be at least 6 characters"));
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      const { token, user } = response.data;
      
      login(token, user);
      toast.success(tr("Welcome back, {{v0}}!", { v0: user.name }));
      navigate(`/${user.role}-dashboard`);
    } catch (error) {
      const errorData = error.response?.data;
      
      // Check if user is unverified
      if (errorData?.isUnverified) {
        setUnverifiedEmail(errorData.email || formData.email);
        navigate('/register', { state: { verificationEmail: errorData.email || formData.email } });
        toast.error(
          <div>
            {tr(errorData.message)}
            <br />
            <button 
              onClick={() => handleResendOTP(errorData.email || formData.email)}
              style={{ 
                marginTop: '10px', 
                padding: '5px 10px', 
                background: '#fff', 
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >{tr("Resend OTP")}</button>
          </div>,
          { autoClose: 8000 }
        );
      } else {
        toast.error(tr(errorData?.message || tr("Login failed")));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async (email) => {
    try {
      const { data } = await authAPI.resendOTP({ email });
      toast.success(tr(data.message || tr("Verification code sent to your email.")));
    } catch (error) {
      toast.error(tr("Failed to resend OTP. Please try again."));
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>{tr("Login")}</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '1.5rem' }}>{tr("Enter your credentials to access your account")}</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>{tr("Email Address *")}</label>
            <input
              type="email"
              name="email"
              className="form-control"
              placeholder={tr("Enter your email")}
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
            {formData.email && !isValidEmail(formData.email) && (
              <small style={{ color: '#dc3545', display: 'block', marginTop: '0.25rem' }}>{tr("Please enter a valid email address")}</small>
            )}
          </div>

          <div className="form-group">
            <label>{tr("Password *")}</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-control"
                placeholder={tr("Enter your password")}
                value={formData.password}
                onChange={handleChange}
                required
                minLength="6"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#666',
                  fontSize: '1.1rem'
                }}
                aria-label={showPassword ? tr("Hide password") : tr("Show password")}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {formData.password && formData.password.length < 6 && (
              <small style={{ color: '#dc3545', display: 'block', marginTop: '0.25rem' }}>{tr("Password must be at least 6 characters")}</small>
            )}
          </div>


          {unverifiedEmail && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>{tr("⚠️ Your email is not verified yet")}</p>
              <button
                type="button"
                onClick={() => handleResendOTP(unverifiedEmail)}
                className="btn btn-warning"
                style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
              >{tr("Resend Verification OTP")}</button>
            </div>
          )}
          <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
            <Link 
              to="/forgot-password" 
              style={{ 
                color: 'var(--primary-color)', 
                textDecoration: 'none',
                fontSize: '0.9rem'
              }}
            >{tr("Forgot Password?")}</Link>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block" 
            disabled={loading || !isFormValid()}
            style={{
              opacity: (!isFormValid() || loading) ? 0.6 : 1,
              cursor: (!isFormValid() || loading) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {loading && <FaSpinner className="spinner" style={{ animation: 'spin 1s linear infinite' }} />}
            {loading ? tr("Logging in...") : tr("Login")}
          </button>
        </form>

        <p className="auth-link" style={{ marginTop: '1.5rem', textAlign: 'center' }}>{tr("Don't have an account?")} <Link to="/register">{tr("Register")}</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
