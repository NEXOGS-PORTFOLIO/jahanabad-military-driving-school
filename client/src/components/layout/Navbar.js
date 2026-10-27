import { useSiteTranslation, translate as tr } from '../../hooks/useSiteTranslation';
import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaFacebook, FaEnvelope, FaGlobe, FaInstagram, FaWhatsapp, FaMapMarkerAlt, FaPhoneAlt, FaYoutube } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { locationMapUrl, socialLinks } from '../../utils/officialLinks';
import logo from '../../assets/jmds-logo.svg';
import './Navbar.css';

const Navbar = () => {
  useSiteTranslation();
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isHome) {
      setScrolled(false);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'bn' : 'en';
    i18n.changeLanguage(newLang);
  };

  const getCurrentLanguageLabel = () => {
    return i18n.language === 'en' ? 'EN' : 'BN';
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getNavClass = ({ isActive }) => `nav-link ${isActive ? 'active' : ''}`;

  const headerClass = [
    'site-header',
    isHome ? 'site-header--home' : '',
    isHome && scrolled ? 'site-header--scrolled' : '',
  ].filter(Boolean).join(' ');

  return (
    <header className={headerClass}>
      <div className="top-contact-bar">
        <div className="container top-contact-container">
          <div className="top-contact-left">
            <a href="tel:01769564999" className="top-contact-item">
              <FaPhoneAlt /> <span>01769-564999</span>
            </a>
            <a href="mailto:info@jmdschool.com" className="top-contact-item">
              <FaEnvelope /> <span>info@jmdschool.com</span>
            </a>
            <a
              href={locationMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="top-contact-item top-contact-location"
              aria-label={tr("Open Jahanabad Cantonment, Khan Jahan Ali, Khulna in Google Maps")}
            >
              <FaMapMarkerAlt />  <span>{t('nav.address')}</span>
            </a>
          </div>
          <div className="top-contact-social">
            <span>{t('nav.followUs')}</span>
            <a
              href={socialLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tr("Jahanabad Military Driving School Facebook")}
            >
              <FaFacebook />
            </a>

            <a
              href={socialLinks.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tr("Message Jahanabad Military Driving School on WhatsApp at 01769-564999")}
            >
              <FaWhatsapp />
            </a>
            <a
              href={socialLinks.youtube}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tr("Jahanabad Military Driving School YouTube")}
            >
              <FaYoutube />
            </a>
            <a
              href={socialLinks.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tr("Jahanabad Military Driving School Instagram")}
            >
              <FaInstagram />
            </a>
          </div>
        </div>
      </div>

      <nav className="navbar">
        <div className="container navbar-container">
          <Link to="/" className="navbar-brand">
            <img src={logo} alt={t('home.title')} className="navbar-logo" width="320" height="350" />
          </Link>

          <div className="navbar-menu">
            <NavLink to="/" end className={getNavClass}>{t('nav.home')}</NavLink>
            <NavLink to="/about" className={getNavClass}>{t('nav.about')}</NavLink>
            <NavLink to="/courses" className={getNavClass}>{t('nav.courses')}</NavLink>
            <NavLink to="/notices" className={getNavClass}>{t('nav.notices')}</NavLink>
            <NavLink to="/gallery" className={getNavClass}>{t('nav.gallery')}</NavLink>
            <NavLink to="/certificate-verify" className={getNavClass}>{t('nav.certificateVerify')}</NavLink>
            <NavLink to="/contact" className={getNavClass}>{t('nav.contact')}</NavLink>
          </div>

          <div className="navbar-actions">
            <button
              onClick={toggleLanguage}
              className="language-toggle-btn"
              title={i18n.language === 'en' ? tr("Switch to Bangla") : tr("Switch to English")}
              aria-label={i18n.language === 'en' ? tr("Switch to Bangla") : tr("Switch to English")}
            >
              <FaGlobe className="globe-icon" />
              <span className="lang-text">{getCurrentLanguageLabel()}</span>
            </button>

            {user ? (
              <>
                <Link to={`/${user.role}-dashboard`} className="btn btn-primary">
                  {t('nav.dashboard')}
                </Link>
                <button onClick={handleLogout} className="btn btn-secondary">
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary">{t('nav.login')}</Link>
                <Link to="/register" className="btn btn-secondary">{t('nav.register')}</Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
