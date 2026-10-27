import PageHero from '../../components/layout/PageHero';
import {
  useSiteTranslation,
  translate as tr,
} from "../../hooks/useSiteTranslation";
import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FaAward,
  FaBookOpen,
  FaBriefcase,
  FaCalendarAlt,
  FaCarSide,
  FaCertificate,
  FaCheckCircle,
  FaChalkboardTeacher,
  FaFlag,
  FaGlobeAsia,
  FaIdCard,
  FaLandmark,
  FaMapMarkerAlt,
  FaRoad,
  FaShieldAlt,
  FaTools,
  FaUserCheck,
  FaUsers,
} from "react-icons/fa";
import trainingImage from "../../assets/pics/WhatsApp Image 2026-01-22 at 1.43.59 PM.jpeg";
import facilityImage from "../../assets/pics/WhatsApp Image 2026-01-22 at 1.44.09 PM.jpeg";
import indoorTrainingImage from "../../assets/pics/indoor_training.jpeg";
import outdoorTrainingImage from "../../assets/pics/outdoor_training.jpeg";
import "./About.css";

const About = () => {
  useSiteTranslation();
  const { t } = useTranslation();
  const missionPoints = t("about.missionPoints", { returnObjects: true });

  const visionIcons = [
    <FaFlag />,
    <FaShieldAlt />,
    <FaBriefcase />,
    <FaCertificate />,
  ];
  const visionPoints = t("about.visionPoints", { returnObjects: true }).map(
    (item, index) => ({
      ...item,
      icon: visionIcons[index],
    }),
  );

  const valueIcons = [
    <FaUserCheck />,
    <FaShieldAlt />,
    <FaChalkboardTeacher />,
    <FaTools />,
    <FaIdCard />,
    <FaFlag />,
  ];
  const values = t("about.values", { returnObjects: true }).map(
    (item, index) => ({
      ...item,
      icon: valueIcons[index],
    }),
  );

  const timeline = t("about.timeline", { returnObjects: true });

  const indoorFacilities = t("about.indoorFacilities", { returnObjects: true });

  const outdoorFacilities = t("about.outdoorFacilities", {
    returnObjects: true,
  });

  const whyIcons = [
    <FaLandmark />,
    <FaUsers />,
    <FaRoad />,
    <FaAward />,
    <FaCarSide />,
    <FaCertificate />,
    <FaGlobeAsia />,
    <FaCheckCircle />,
  ];
  const whyChoose = t("about.whyChoose", { returnObjects: true }).map(
    (item, index) => ({
      ...item,
      icon: whyIcons[index],
    }),
  );

  const renderChecklist = (items) => (
    <ul className="about-check-list">
      {items.map((item) => (
        <li key={item}>
          <FaCheckCircle />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="about-page">
      <PageHero title={t('about.title')} subtitle={t('about.subtitle')} />

      <section className="about-section about-two-column">
        <div className="about-copy">
          <span className="about-kicker">{t("about.profileKicker")}</span>
          <h2>{t("about.whoTitle")}</h2>
          <p>{t("about.whoP1")}</p>
          <p>{t("about.whoP2")}</p>
          {renderChecklist(t("about.whoPoints", { returnObjects: true }))}
        </div>
        <div className="about-visual-card">
          <img
            src={trainingImage}
            alt={tr("Jahanabad Military Driving School training activity")}
          />
          <div className="about-info-strip">
            <FaMapMarkerAlt />
            <div>
              <strong>{t("about.locationTitle")}</strong>
              <span>{t("about.locationText")}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="about-section about-two-column reverse">
        <div className="official-card">
          <img src={facilityImage} alt={tr("Road safety mission")} />
          <div className="official-card-overlay"></div>
          <FaShieldAlt />
          <h3>{t("about.missionCardTitle")}</h3>
          <p>{t("about.missionCardText")}</p>
        </div>
        <div className="about-copy">
          <span className="about-kicker">{t("about.missionKicker")}</span>
          <h2>{t("about.missionTitle")}</h2>
          <p>{t("about.missionText")}</p>
          {renderChecklist(missionPoints)}
        </div>
      </section>

      <section className="about-section about-two-column">
        <div className="about-copy">
          <span className="about-kicker">{t("about.visionKicker")}</span>
          <h2>{t("about.visionTitle")}</h2>
          <p>{t("about.visionText")}</p>
        </div>
        <div className="vision-grid">
          {visionPoints.map((item) => (
            <div className="mini-card" key={item.title}>
              {item.icon}
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="about-section values-section">
        <div className="about-section-heading">
          <span className="about-kicker">{t("about.valuesKicker")}</span>
          <h2>{t("about.valuesTitle")}</h2>
        </div>
        <div className="values-grid">
          {values.map((item) => (
            <div className="value-card" key={item.title}>
              <div className="value-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="about-section journey-section">
        <div className="about-section-heading">
          <span className="about-kicker">{t("about.journeyKicker")}</span>
          <h2>{t("about.journeyTitle")}</h2>
          <p>{t("about.journeySubtitle")}</p>
        </div>
        <div className="timeline">
          {timeline.map((item) => (
            <div className="timeline-item" key={`${item.date}-${item.title}`}>
              <div className="timeline-date">
                <FaCalendarAlt />
                <span>{item.date}</span>
              </div>
              <div className="timeline-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="about-section facilities-section">
        <div className="about-section-heading">
          <span className="about-kicker">{t("about.facilitiesKicker")}</span>
          <h2>{t("about.facilitiesTitle")}</h2>
          <p>{t("about.facilitiesSubtitle")}</p>
        </div>
        <div className="facility-layout">
          <div className="facility-card facility-media-card">
            <div className="facility-card-image">
              <img src={indoorTrainingImage} alt={t("about.indoorTitle")} />
            </div>
            <div className="facility-card-content">
              <FaBookOpen />
              <h3>{t("about.indoorTitle")}</h3>
              {renderChecklist(indoorFacilities)}
            </div>
          </div>
          <div className="facility-card facility-media-card">
            <div className="facility-card-image">
              <img src={outdoorTrainingImage} alt={t("about.outdoorTitle")} />
            </div>
            <div className="facility-card-content">
              <FaRoad />
              <h3>{t("about.outdoorTitle")}</h3>
              {renderChecklist(outdoorFacilities)}
            </div>
          </div>
        </div>
      </section>

      <section className="about-section why-section">
        <div className="about-section-heading">
          <span className="about-kicker">{t("about.whyKicker")}</span>
          <h2>{t("about.whyTitle")}</h2>
        </div>
        <div className="why-grid">
          {whyChoose.map((item) => (
            <div className="why-card" key={item.title}>
              {item.icon}
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="about-cta">
        <div className="container about-cta-content">
          <h2>{t("about.ctaTitle")}</h2>
          <p>{t("about.ctaText")}</p>
          <div className="about-cta-actions">
            <Link to="/courses" className="btn btn-primary">
              {t("common.viewCourses")}
            </Link>
            <Link to="/certificate-verify" className="btn btn-secondary">
              {t("common.verifyCertificate")}
            </Link>
            <Link to="/contact" className="btn btn-outline-about">
              {t("common.contactUs")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
