import { useSiteTranslation, translate as tr } from '../../hooks/useSiteTranslation';
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaFacebook, FaEnvelope, FaInstagram, FaWhatsapp, FaMapMarkerAlt, FaPhoneAlt, FaYoutube } from 'react-icons/fa';
import { locationMapUrl, socialLinks } from '../../utils/officialLinks';
import './Footer.css';

const recognitionLogos = [
  { name: 'BRTA Registered', src: '/logos/BRTA.svg' },
  { name: 'BAIRA MoU', src: '/logos/baira-logo.png' },
  { name: 'Jahanabad Cantonment', src: '/logos/Cantonment.svg' }
];

const Footer = () => {
  useSiteTranslation();
  const { t } = useTranslation();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>{tr("Jahanabad Military Driving School")}</h3>
            <p>{t("footer.tagline")}</p>
            <div className="social-links">
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={tr("Jahanabad Military Driving School Facebook")}
              >
                <FaFacebook />
              </a>
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={tr("Jahanabad Military Driving School Instagram")}
              >
                <FaInstagram />
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
            </div>
          </div>

          <div className="footer-section">
            <h4>{t("footer.quickLinks")}</h4>
            <ul>
              <li>
                <Link to="/">{t("nav.home")}</Link>
              </li>
              <li>
                <Link to="/about">{t("nav.about")}</Link>
              </li>
              <li>
                <Link to="/courses">{t("nav.courses")}</Link>
              </li>
              <li>
                <Link to="/notices">{t("nav.notices")}</Link>
              </li>
              <li>
                <Link to="/certificate-verify">
                  {t("nav.certificateVerify")}
                </Link>
              </li>
              <li>
                <Link to="/contact">{t("nav.contact")}</Link>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>{t("footer.recognition")}</h4>
            <div className="recognition-logo-grid">
              {recognitionLogos.map((logo) => (
                <img
                  className="recognition-logo"
                  src={logo.src}
                  alt={logo.name}
                  key={logo.name}
                />
              ))}
            </div>
          </div>

          <div className="footer-section">
            <h4>{t("footer.contactInfo")}</h4>
            <a
              className="contact-item footer-location-link"
              href={locationMapUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaMapMarkerAlt /> <span>{t("footer.location")}</span>
            </a>
            <div className="contact-item">
              <FaPhoneAlt /> <span>01769-564999</span>
            </div>
            <div className="contact-item">
              <FaEnvelope /> <span>info@jmdschool.com</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            &copy; {new Date().getFullYear()} {tr("Jahanabad Military Driving School.")}</p>
          <p className="footer-credit">
            <span>
              {t("footer.rights")} {t('footer.developedBy')}{" "}
              <strong>
                <a
                  href="https://www.nexogs.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Nexogs System Ltd.
                </a>
              </strong>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
