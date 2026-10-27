import { useSiteTranslation, translate as tr } from '../../hooks/useSiteTranslation';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../utils/api';
import { toast } from 'react-toastify';
import {
  FaEnvelope, FaEye, FaEyeSlash, FaSpinner,
  FaCheckCircle, FaArrowLeft
} from 'react-icons/fa';
import './Auth.css';

const ForgotPassword = () => {
  useSiteTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);          // 1: email  2: OTP  3: new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendCount, setResendCount] = useState(0); // bumped to restart timer
  const [done, setDone] = useState(false);

  const otpRefs = useRef([]);

  // Start / restart the resend countdown whenever step 2 is active or resend is triggered
  useEffect(() => {
    if (step !== 2) return;
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, resendCount]);

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const otpValue = otp.join('');

  // ── OTP box helpers ────────────────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0)
      otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowLeft' && index > 0)
      otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5)
      otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    const next = ['', '', '', '', '', ''];
    digits.split('').forEach((d, i) => { next[i] = d; });
    setOtp(next);
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  // ── Step 1: request OTP ────────────────────────────────────────────────────
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) { toast.error(tr("Please enter a valid email address")); return; }
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      toast.success(tr("OTP sent! Please check your email."));
      setStep(2);
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Failed to send OTP. Please try again.")));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ─────────────────────────────────────────────────────
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otpValue.length !== 6) { toast.error(tr("Please enter the complete 6-digit OTP")); return; }
    setLoading(true);
    try {
      await authAPI.verifyResetOTP({ email, otp: otpValue });
      toast.success(tr("OTP verified! Set your new password."));
      setStep(3);
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Invalid or expired OTP")));
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      toast.success(tr("A new OTP has been sent to your email."));
      setOtp(['', '', '', '', '', '']);
      setResendCount(c => c + 1); // triggers useEffect to restart 60 s timer
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Failed to resend OTP")));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: reset password ─────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error(tr("Password must be at least 6 characters")); return; }
    if (newPassword !== confirmPassword) { toast.error(tr("Passwords do not match")); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword({ email, otp: otpValue, newPassword });
      toast.success(tr("Password reset successfully!"));
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
      const msg = error.response?.data?.message || tr("Failed to reset password");
      toast.error(tr(msg));
      if (msg.toLowerCase().includes('expired')) {
        setStep(2);
        setOtp(['', '', '', '', '', '']);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Shared sub-components ──────────────────────────────────────────────────
  const StepDots = () => (
    <div className="fp-steps">
      {[1, 2, 3].map(s => (
        <div
          key={s}
          className={`fp-step-dot${s === step ? ' active' : s < step ? ' done' : ''}`}
        />
      ))}
    </div>
  );

  const EmailBadge = () => (
    <div className="fp-email-display">
      <FaEnvelope />
      <span>{email}</span>
    </div>
  );

  const SubmitBtn = ({ disabled, label, loadingLabel }) => (
    <button
      type="submit"
      className="btn btn-primary btn-block"
      disabled={disabled || loading}
      style={{
        opacity: (disabled || loading) ? 0.6 : 1,
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
      }}
    >
      {loading && <FaSpinner className="spinner" />}
      {loading ? loadingLabel : label}
    </button>
  );

  // ── Success screen ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="fp-success">
            <div className="fp-success-icon"><FaCheckCircle /></div>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '0.75rem' }}>{tr("Password Reset!")}</h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{tr("Your password has been changed successfully.")}<br />{tr("Redirecting to login…")}</p>
            <Link to="/login" className="btn btn-primary btn-block">{tr("Go to Login")}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <StepDots />

        {/* ── Step 1: Email ─────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <h1>{tr("Forgot Password")}</h1>
            <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '1.5rem' }}>{tr("Enter your registered email and we'll send you a one-time password.")}</p>

            <form onSubmit={handleRequestOTP} className="auth-form">
              <div className="form-group">
                <label>{tr("Email Address *")}</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder={tr("Enter your registered email")}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
                {email && !isValidEmail(email) && (
                  <small style={{ color: '#dc3545', display: 'block', marginTop: '0.25rem' }}>{tr("Please enter a valid email address")}</small>
                )}
              </div>

              <SubmitBtn
                disabled={!email || !isValidEmail(email)}
                label={tr("Send OTP")}
                loadingLabel={tr("Sending OTP…")}
              />
            </form>

            <p className="auth-link">{tr("Remember your password?")} <Link to="/login">{tr("Login")}</Link>
            </p>
          </>
        )}

        {/* ── Step 2: OTP Verification ──────────────────────────────────── */}
        {step === 2 && (
          <>
            <h1>{tr("Verify OTP")}</h1>
            <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '1rem' }}>{tr("Enter the 6-digit OTP sent to your email. It expires in 10 minutes.")}</p>
            <EmailBadge />

            <form onSubmit={handleVerifyOTP} className="auth-form">
              <div className="otp-boxes">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    className={`otp-box${digit ? ' filled' : ''}`}
                    autoFocus={i === 0}
                    aria-label={tr("OTP digit {{v0}}", { v0: i + 1 })}
                  />
                ))}
              </div>

              <SubmitBtn
                disabled={otpValue.length !== 6}
                label={tr("Verify OTP")}
                loadingLabel={tr("Verifying…")}
              />
            </form>

            <div className="fp-resend-row">
              {resendTimer > 0 ? (
                <span>{tr("Resend OTP in")} {resendTimer}{tr("s")}</span>
              ) : (
                <button
                  className="fp-resend-btn"
                  onClick={handleResendOTP}
                  disabled={loading}
                >{tr("Resend OTP")}</button>
              )}
            </div>

            <p className="auth-link" style={{ marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); }}
                style={{
                  background: 'none', border: 'none', color: 'var(--primary-color)',
                  cursor: 'pointer', font: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                }}
              >
                <FaArrowLeft size={12} /> {tr("Change email")}</button>
            </p>
          </>
        )}

        {/* ── Step 3: New Password ──────────────────────────────────────── */}
        {step === 3 && (
          <>
            <h1>{tr("Reset Password")}</h1>
            <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '1rem' }}>{tr("Create a strong new password for your account.")}</p>
            <EmailBadge />

            <form onSubmit={handleResetPassword} className="auth-form">
              <div className="form-group">
                <label>{tr("New Password *")}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder={tr("Enter new password (min. 6 characters)")}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%',
                      transform: 'translateY(-50%)', background: 'none',
                      border: 'none', cursor: 'pointer', color: '#666', fontSize: '1.1rem'
                    }}
                    aria-label={showPassword ? tr("Hide password") : tr("Show password")}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {newPassword && newPassword.length < 6 && (
                  <small style={{ color: '#dc3545', display: 'block', marginTop: '0.25rem' }}>{tr("Password must be at least 6 characters")}</small>
                )}
              </div>

              <div className="form-group">
                <label>{tr("Confirm Password *")}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="form-control"
                    placeholder={tr("Re-enter new password")}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%',
                      transform: 'translateY(-50%)', background: 'none',
                      border: 'none', cursor: 'pointer', color: '#666', fontSize: '1.1rem'
                    }}
                    aria-label={showConfirm ? tr("Hide password") : tr("Show password")}
                  >
                    {showConfirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <small style={{ color: '#dc3545', display: 'block', marginTop: '0.25rem' }}>{tr("Passwords do not match")}</small>
                )}
              </div>

              <SubmitBtn
                disabled={newPassword.length < 6 || newPassword !== confirmPassword}
                label={tr("Reset Password")}
                loadingLabel={tr("Resetting…")}
              />
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
