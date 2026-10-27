import { useSiteTranslation, translate as tr } from '../../hooks/useSiteTranslation';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaAward,
  FaBookOpen,
  FaCalendarAlt,
  FaCarSide,
  FaCheckCircle,
  FaClipboardList,
  FaExternalLinkAlt,
  FaGlobeAsia,
  FaIdCard,
  FaLandmark,
  FaRoad,
  FaShieldAlt,
  FaTools,
  FaUserTie,
  FaQuestionCircle
} from 'react-icons/fa';
import heroVideo from '../../assets/snapsave-app_9444128665688408_hd.mp4';
import { noticeAPI, resolveAssetUrl } from '../../utils/api';
import './Home.css';

const Home = () => {
  const { locale } = useSiteTranslation();
  const { t } = useTranslation();
  const [featuredNotices, setFeaturedNotices] = useState([]);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [noticesError, setNoticesError] = useState('');

  useEffect(() => {
    const fetchLatestNotices = async () => {
      try {
        const response = await noticeAPI.getNotices({ limit: 3 });
        setFeaturedNotices(response.data.data || []);
        setNoticesError('');
      } catch (error) {
        setNoticesError('Unable to load notices at the moment.');
      } finally {
        setNoticesLoading(false);
      }
    };

    fetchLatestNotices();
  }, []);

  const formatDate = (date) => new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const whyIcons = [<FaShieldAlt />, <FaLandmark />, <FaAward />, <FaBookOpen />, <FaRoad />, <FaGlobeAsia />];
  const whyChooseItems = t('home.whyItems', { returnObjects: true });
  const faqItems = t('home.faqs', { returnObjects: true });

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <video autoPlay loop muted playsInline className="hero-video">
          <source src={heroVideo} type="video/mp4" />{tr("Your browser does not support the video tag.")}</video>
        <div className="hero-overlay"></div>
        <div className="container">
          <div className="hero-content">
            <h1>{t('home.title')}</h1>
            <p className="hero-subtitle">{t('home.subtitle')}</p>
            <p className="hero-intro">{t('home.intro')}</p>
            <Link to="/register" className="btn btn-primary btn-large">
              {t('home.enrollNow')}
            </Link>
          </div>
        </div>
      </section>

      {/* Notices Section */}
      <section className="home-notices-section">
        <div className="container">
          <div className="section-heading">
            <span className="section-kicker">{t('home.noticesKicker')}</span>
            <h2>{t('home.noticesTitle')}</h2>
            <p>{t('home.noticesSubtitle')}</p>
          </div>

          {noticesLoading ? (
            <div className="notice-state">{t('home.noticesLoading')}</div>
          ) : noticesError ? (
            <div className="notice-state notice-state-error">{t('home.noticesError')}</div>
          ) : featuredNotices.length === 0 ? (
            <div className="notice-state">{t('home.noticesEmpty')}</div>
          ) : (
            <div className="notice-preview-grid">
              {featuredNotices.map((notice) => (
                <article className={`notice-card ${notice.image?.url ? 'has-image' : 'no-image'}`} key={notice._id}>
                  {notice.image?.url && (
                    <img src={resolveAssetUrl(notice.image.url)} alt={notice.title} className="notice-card-image" />
                  )}
                  <div className="notice-card-body">
                    <div className="notice-card-top">
                      <span className={`notice-badge badge-${notice.type.toLowerCase()}`}>
                        {tr(notice.type)}
                      </span>
                      <span className="notice-date">
                        <FaCalendarAlt /> {formatDate(notice.publishDate)}
                      </span>
                    </div>
                    <h3>{notice.title}</h3>
                    <p>{notice.excerpt || notice.content}</p>
                    <Link to={`/notices/${notice.slug}`} className="notice-read-more">
                      {t('common.readMore')} <FaExternalLinkAlt />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="section-action">
            <Link to="/notices" className="btn btn-primary">{t('common.seeMore')}</Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-heading">
            <span className="section-kicker">{t('home.whyKicker')}</span>
            <h2>{t('home.whyChoose')}</h2>
            <p>{t('home.whySubtitle')}</p>
          </div>
          <div className="features-grid">
            {whyChooseItems.map((item, index) => (
              <div className="feature-card" key={item.title}>
                <div className="feature-icon">{whyIcons[index]}</div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
          <div className="why-choose-action">
            <Link to="/about" className="btn btn-primary">{t('home.whyCta')}</Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-panel">
            <div className="cta-icon-group" aria-hidden="true">
              <FaCarSide />
              <FaTools />
              <FaUserTie />
            </div>
            <h2>{t('home.journeyTitle')}</h2>
            <p>{t('home.journeySubtitle')}</p>
            <div className="cta-buttons">
              <Link to="/courses" className="btn btn-primary">{t('common.viewCourses')}</Link>
              <Link to="/contact" className="btn btn-secondary">{t('common.contactUs')}</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Certificate Verification CTA */}
      <section className="certificate-cta-section">
        <div className="container certificate-cta-container">
          <div className="certificate-cta-icon">
            <FaIdCard />
          </div>
          <div className="certificate-cta-content">
            <span className="section-kicker">{t('home.certificateKicker')}</span>
            <h2>{t('home.certificateTitle')}</h2>
            <p>{t('home.certificateSubtitle')}</p>
          </div>
          <div className="certificate-cta-actions">
            <Link to="/certificate-verify" className="btn btn-primary">
              <FaCheckCircle /> {t('common.verifyCertificate')}
            </Link>
            <Link to="/login" className="btn btn-outline-light">
              <FaClipboardList /> {t('home.loginDashboard')}
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="home-faq-section">
        <div className="container">
          <div className="section-heading">
            <span className="section-kicker">{t('home.faqKicker')}</span>
            <h2>{t('home.faqTitle')}</h2>
            <p>{t('home.faqSubtitle')}</p>
          </div>
          <div className="faq-grid">
            <div className="faq-intro-card">
              <FaQuestionCircle />
              <h3>{t('home.faqCardTitle')}</h3>
              <p>{t('home.faqCardText')}</p>
              <Link to="/contact" className="btn btn-primary">{t('common.contactUs')}</Link>
            </div>
            <div className="faq-list">
              {faqItems.map((item) => (
                <details className="faq-item" key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
