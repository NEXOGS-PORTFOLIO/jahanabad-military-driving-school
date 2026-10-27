import PageHero from '../../components/layout/PageHero';
import { useSiteTranslation, translate as tr } from '../../hooks/useSiteTranslation';
import React, { useState } from 'react';
import useCertificateCaptcha from '../../hooks/useCertificateCaptcha';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaAward,
  FaCertificate,
  FaClipboardCheck,
  FaFileSignature,
  FaIdCard,
  FaRoad,
  FaShieldAlt,
  FaUserGraduate
} from 'react-icons/fa';
import { certificateAPI } from '../../utils/api';
import { toast } from 'react-toastify';
import './CertificateVerify.css';

const CertificateVerify = () => {
  const { locale } = useSiteTranslation();
  const { t } = useTranslation();
  const [certificateId, setCertificateId] = useState(() => new URLSearchParams(window.location.search).get('certificateId') || '');
  const { captcha, captchaToken, answer: userCaptcha, setAnswer: setUserCaptcha,
    loading: captchaLoading, error: captchaError, refresh: generateNewCaptcha } = useCertificateCaptcha();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const certificateSteps = t('certification.steps', { returnObjects: true });
  const trustIcons = [<FaShieldAlt />, <FaIdCard />, <FaClipboardCheck />, <FaAward />, <FaRoad />, <FaUserGraduate />];
  const trustFactors = t('certification.trustFactors', { returnObjects: true }).map((title, index) => ({
    icon: trustIcons[index],
    title
  }));

  const handleVerify = async (e) => {
    e.preventDefault();
    if (captchaLoading || !captchaToken) return;

    if (!certificateId.trim()) {
      toast.error(tr("Please enter certificate ID"));
      return;
    }

    if (!userCaptcha.trim()) {
      toast.error(tr("Please enter captcha"));
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const response = await certificateAPI.verifyCertificate({
        certificateId: certificateId.trim(),
        captcha: userCaptcha,
        captchaToken
      });
      setResult(response.data.data);
      toast.success(tr("Certificate verified successfully"));
    } catch (error) {
      const errorMsg = error.response?.data?.message || tr("Verification failed");
      if (error.response?.data?.data) {
        setResult(error.response.data.data);
      }
      toast.error(tr(errorMsg));
    } finally {
      setLoading(false);
      generateNewCaptcha();
    }
  };

  return (
    <div className="certification-page">
      <PageHero title={t('certification.title')} subtitle={t('certification.subtitle')} />

      <section className="verification-section container">
        <div className="verification-intro">
          <FaCertificate />
          <h2>{t('certification.verifyTitle')}</h2>
          <p>{t('certification.verifyText')}</p>
        </div>

        <div className="verify-form-container">
          <form onSubmit={handleVerify} className="verify-form">
            <div className="form-group">
              <label>{t('certification.certificateId')}</label>
              <input
                type="text"
                className="form-control"
                placeholder={t('certification.certificatePlaceholder')}
                value={certificateId}
                onChange={(e) => setCertificateId(e.target.value)}
                required
              />
            </div>

            <div className="captcha-section">
              <label>{t('certification.verificationCode')}</label>
              <div className="captcha-display">
                <span className="captcha-text">{captchaLoading ? tr('Loading...') : captcha}</span>
                <button type="button" disabled={loading || captchaLoading} onClick={generateNewCaptcha} className="btn btn-secondary btn-small">
                  {t('certification.refresh')}
                </button>
              </div>
              <input
                type="text"
                className="form-control"
                placeholder={t('certification.captchaPlaceholder')}
                value={userCaptcha}
                onChange={(e) => setUserCaptcha(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
                required
              />
              <small>{tr('CAPTCHA is case-sensitive. Enter the characters exactly as shown.')}</small>
              {captchaError && <p role="alert">{tr(captchaError)}</p>}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading || captchaLoading || !captchaToken}>
              {loading ? t('certification.verifying') : t('common.verifyCertificate')}
            </button>
          </form>

          {result && (
            <div className={`result-section ${result.status === 'Valid' ? 'valid' : 'invalid'}`}>
              <h2>{t('certification.result')}</h2>
              <div className="result-item">
                <strong>{t('common.status')}:</strong> <span className="status">{tr(result.status)}</span>
              </div>
              <div className="result-item">
                <strong>{t('certification.certificateId')}:</strong> {result.certificateId || certificateId}
              </div>
              {result.studentName && (
                <>
                  <div className="result-item">
                    <strong>{t('certification.studentName')}:</strong> {result.studentName}
                  </div>
                  <div className="result-item">
                    <strong>{t('certification.course')}:</strong> {result.courseName}
                  </div>
                  {result.batchName && (
                    <div className="result-item">
                      <strong>{t('certification.batch')}:</strong> {result.batchName}
                    </div>
                  )}
                  {result.courseType && (
                    <div className="result-item">
                      <strong>{t('certification.courseType')}:</strong> {result.courseType}
                    </div>
                  )}
                  <div className="result-item">
                    <strong>{t('certification.duration')}:</strong> {result.courseDuration}
                  </div>
                  <div className="result-item">
                    <strong>{t('certification.issuedDate')}:</strong> {new Date(result.issuedDate).toLocaleDateString(locale)}
                  </div>
                </>
              )}
              {result.revokedAt && (
                <div className="result-item">
                  <strong>{t('certification.revoked')}:</strong> {new Date(result.revokedAt).toLocaleDateString(locale)}
                  <br />
                  <strong>{t('certification.reason')}:</strong> {result.revokeReason}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="certificate-process-section">
        <div className="container">
          <div className="cert-section-heading">
            <span className="certification-kicker">{t('certification.processKicker')}</span>
            <h2>{t('certification.processTitle')}</h2>
          </div>
          <div className="certificate-step-grid">
            {certificateSteps.map((step, index) => (
              <div className="certificate-step-card" key={step.title}>
                <span>{t('certification.step')} {index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="license-guidance-section container">
        <div className="license-guidance-card">
          <FaFileSignature />
          <div>
            <span className="certification-kicker">{t('certification.guidanceKicker')}</span>
            <h2>{t('certification.guidanceTitle')}</h2>
            <p>{t('certification.guidanceText')}</p>
          </div>
        </div>
      </section>

      <section className="cert-trust-section">
        <div className="container">
          <div className="cert-section-heading">
            <span className="certification-kicker">{t('certification.trustKicker')}</span>
            <h2>{t('certification.trustTitle')}</h2>
          </div>
          <div className="cert-trust-grid">
            {trustFactors.map((item) => (
              <div className="cert-trust-card" key={item.title}>
                {item.icon}
                <h3>{item.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="certification-cta">
        <div className="container">
          <h2>{t('certification.ctaTitle')}</h2>
          <p>{t('certification.ctaText')}</p>
          <Link to="/contact" className="btn btn-primary">{t('common.contactUs')}</Link>
        </div>
      </section>
    </div>
  );
};

export default CertificateVerify;
