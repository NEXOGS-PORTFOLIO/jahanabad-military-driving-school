import { useSiteTranslation, translate as tr } from '../../../hooks/useSiteTranslation';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FaCheckCircle, FaTimesCircle, FaSync } from 'react-icons/fa';
import { certificateAPI } from '../../../utils/api';
import useCertificateCaptcha from '../../../hooks/useCertificateCaptcha';

const VerificationSection = () => {
  const { locale } = useSiteTranslation();
  const [certificateId, setCertificateId] = useState('');
  const { captcha: captchaText, captchaToken, answer: captcha, setAnswer: setCaptcha,
    loading: captchaLoading, error: captchaError, refresh: refreshCaptcha } = useCertificateCaptcha();
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    
    setVerificationResult(null);
    if (captchaLoading || !captchaToken) return;
    if (captcha !== captchaText) {
      toast.error(tr("Invalid captcha. Please try again."));
      refreshCaptcha();
      return;
    }

    setLoading(true);
    try {
      const response = await certificateAPI.verifyCertificate({
        certificateId: certificateId.trim(),
        captcha,
        captchaToken
      });
      setVerificationResult(response.data);
      toast.success(tr("Certificate verified successfully"));
    } catch (error) {
      setVerificationResult({
        success: false,
        message: error.response?.data?.message || 'Certificate not found'
      });
      toast.error(tr(error.response?.data?.message || 'Verification failed'));
    } finally {
      setLoading(false);
      refreshCaptcha();
    }
  };

  const handleReset = () => {
    setCertificateId('');
    setCaptcha('');
    setVerificationResult(null);
    refreshCaptcha();
  };

  return (
    <div className="section">
      <div className="section-header">
        <h1>{tr("Verify My Certificate")}</h1>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <form onSubmit={handleVerify} style={{ 
          background: 'white', 
          padding: '2rem', 
          borderRadius: '10px',
          boxShadow: 'var(--shadow)'
        }}>
          <div className="form-group">
            <label>{tr("Certificate ID")}</label>
            <input
              type="text"
              className="form-control"
              placeholder={tr("Enter your certificate ID")}
              value={certificateId}
              onChange={(e) => setCertificateId(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>{tr("Enter Captcha")}</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{
                background: '#f0f0f0',
                padding: '1rem 1.5rem',
                borderRadius: '5px',
                fontWeight: 'bold',
                fontSize: '1.5rem',
                letterSpacing: '5px',
                userSelect: 'none',
                fontFamily: 'monospace'
              }}>
                {captchaLoading ? tr('Loading...') : captchaText}
              </div>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={refreshCaptcha}
                disabled={loading || captchaLoading}
                aria-label={tr('Refresh CAPTCHA')}
                style={{ padding: '0.75rem' }}
              >
                <FaSync />
              </button>
            </div>
            <input
              type="text"
              className="form-control"
              placeholder={tr("Enter captcha code")}
              value={captcha}
              onChange={(e) => setCaptcha(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              required
              style={{ marginTop: '1rem' }}
            />
            
            {captchaError && <p role="alert">{tr(captchaError)}</p>}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" disabled={loading} onClick={handleReset}>{tr("Reset")}</button>
            <button type="submit" className="btn btn-primary" disabled={loading || captchaLoading || !captchaToken}>
              {loading ? tr("Verifying...") : tr("Verify Certificate")}
            </button>
          </div>
        </form>

        {verificationResult && (
          <div style={{
            marginTop: '2rem',
            padding: '2rem',
            background: verificationResult.success ? '#d4edda' : '#f8d7da',
            borderRadius: '10px',
            border: `2px solid ${verificationResult.success ? '#28a745' : '#dc3545'}`
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              {verificationResult.success ? (
                <FaCheckCircle size={40} color="#28a745" />
              ) : (
                <FaTimesCircle size={40} color="#dc3545" />
              )}
              <h3 style={{ 
                color: verificationResult.success ? '#155724' : '#721c24',
                margin: 0
              }}>
                {verificationResult.success ? tr(verificationResult.data?.status === 'Valid' ? 'Valid Certificate' : 'Invalid Certificate') : tr('Verification failed')}
              </h3>
            </div>

            {verificationResult.success && verificationResult.data && (
              <div style={{ color: '#155724' }}>
                <p><strong>{tr("Certificate ID:")}</strong> {verificationResult.data.certificateId}</p>
                <p><strong>{tr("Student:")}</strong> {verificationResult.data.studentName}</p>
                <p><strong>{tr("Course:")}</strong> {verificationResult.data.courseName}</p>
                <p><strong>{tr("Duration:")}</strong> {verificationResult.data.courseDuration}</p>
                <p><strong>{tr("Issue Date:")}</strong> {new Date(verificationResult.data.issuedDate).toLocaleDateString(locale)}</p>
                <p><strong>{tr("Status:")}</strong> <span className="status-badge valid">{tr(verificationResult.data.status)}</span></p>
              </div>
            )}

            {!verificationResult.success && (
              <p style={{ color: '#721c24', margin: 0 }}>
                {tr(verificationResult.message)}
              </p>
            )}
          </div>
        )}
      </div>

      <div style={{ 
        marginTop: '2rem', 
        padding: '1.5rem', 
        background: '#f8f9fa', 
        borderRadius: '10px',
        borderLeft: '4px solid var(--primary-color)'
      }}>
        <h4 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>{tr("About Certificate Verification")}</h4>
        <ul style={{ lineHeight: '1.8' }}>
          <li>{tr("Use this tool to verify your own certificates internally")}</li>
          <li>{tr("Find your Certificate IDs in the \"Certificate IDs\" section")}</li>
          <li>{tr("For public verification, use the main")} <a href="/certificate-verify" style={{ color: 'var(--primary-color)' }}>{tr("Certificate Verify")}</a> {tr("page")}</li>
          <li>{tr("All valid certificates are stored securely in our database")}</li>
        </ul>
      </div>
    </div>
  );
};

export default VerificationSection;
