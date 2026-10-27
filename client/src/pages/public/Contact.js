import FieldFeedback from "../../components/FieldFeedback";
import useFormValidation from "../../hooks/useFormValidation";
import PageHero from "../../components/layout/PageHero";
import {
  useSiteTranslation,
  translate as tr,
} from "../../hooks/useSiteTranslation";
import React, { useRef, useState } from "react";
import {
  CONTACT_LIMITS,
  normalizeContact,
  validateContact,
} from "../../utils/contactValidation";
import { useTranslation } from "react-i18next";
import { contactAPI } from "../../utils/api";
import { toast } from "react-toastify";
import {
  FaCertificate,
  FaClipboardList,
  FaEnvelope,
  FaFacebook,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaRegCalendarAlt,
  FaRoad,
  FaUsers,
} from "react-icons/fa";
import "./Contact.css";

const contactCards = [
  { title: "Officer In Charge", phone: "01769-564902" },
  { title: "JCO Instructor", phone: "01769-564900" },
  { title: "Office", phone: "01769-564999" },
];

const supportItems = [
  { icon: <FaClipboardList />, title: "Admission information" },
  { icon: <FaRegCalendarAlt />, title: "Course schedule" },
  { icon: <FaInfoCircle />, title: "Course fee" },
  { icon: <FaCertificate />, title: "Certificate verification" },
  { icon: <FaRoad />, title: "Training facilities" },
  { icon: <FaUsers />, title: "General queries" },
];

const Contact = () => {
  useSiteTranslation();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const submitting = useRef(false);
  const {
    errors,
    touched,
    touch,
    fieldProps,
    revealErrors,
    resetValidation,
    setServerErrors,
  } = useFormValidation(
    formData,
    validateContact,
    "contact",
    loading,
    CONTACT_LIMITS,
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    touch(name);
    setFeedback(null);
  };

  const fieldError = (name) => (
    <FieldFeedback
      prefix="contact"
      name={name}
      touched={touched[name]}
      error={errors[name]}
    />
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting.current) return;
    const validationErrors = revealErrors();
    if (Object.keys(validationErrors).length) {
      setFeedback({
        type: "error",
        message:
          "Please correct the highlighted fields before sending your message.",
      });
      return;
    }
    submitting.current = true;
    setLoading(true);
    setFeedback(null);
    try {
      await contactAPI.submitContactForm(normalizeContact(formData));
      const message =
        "Message sent successfully! We will get back to you soon.";
      toast.success(tr(message));
      setFeedback({ type: "success", message });
      setFormData({ name: "", email: "", phone: "", message: "" });
      resetValidation();
    } catch (error) {
      const fields = error.response?.data?.errors;
      if (fields && typeof fields === "object" && !Array.isArray(fields)) {
        const safeErrors = Object.fromEntries(
          Object.entries(fields).filter(
            ([key, value]) => key in formData && typeof value === "string",
          ),
        );
        setServerErrors(safeErrors);
        const first = Object.keys(safeErrors)[0];
        if (first) document.getElementById(`contact-${first}`)?.focus();
      }
      const message =
        error.response?.status === 429
          ? "Too many messages. Please wait 15 minutes before trying again."
          : error.response?.data?.code === "CONTACT_EMAIL_FAILED"
          ? "Your message was saved, but the email could not be sent. Please try again later or call 01769-564999."
          : "Unable to send your message. Your information has been kept; please try again.";
      setFeedback({ type: "error", message });
      toast.error(tr(message));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      <PageHero title={t("contact.title")} subtitle={t("contact.subtitle")} />

      <section className="contact-main-section container">
        <div className="contact-info-panel">
          <h2>{t("contact.getInTouch")}</h2>
          <p>{t("contact.getInTouchText")}</p>

          <div className="info-item">
            <FaMapMarkerAlt className="info-icon" />
            <div>
              <h3>{t("contact.location")}</h3>
              <p>{t("contact.locationText")}</p>
            </div>
          </div>

          <div className="info-item">
            <FaEnvelope className="info-icon" />
            <div>
              <h3>{t("common.email")}</h3>
              <p>info@jmdschool.com</p>
            </div>
          </div>

          <a
            className="facebook-button"
            href="https://www.facebook.com/share/18Jk4ysSow/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaFacebook /> {t("contact.visitFacebook")}
          </a>

          <div className="contact-map">
            <iframe
              title={tr("Jahanabad Cantonment Khulna Map")}
              src="https://www.google.com/maps?q=Jahanabad%20Cantonment%2C%20Khan%20Jahan%20Ali%2C%20Khulna&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="contact-form validated-form"
          noValidate
          aria-busy={loading}
        >
          <h2>{t("contact.sendMessage")}</h2>
          <p className="contact-form-hint">{tr("All fields are required.")}</p>
          <div className="form-group">
            <label htmlFor="contact-name">{tr("Full Name *")}</label>
            <input
              type="text"
              {...fieldProps("name")}
              onChange={handleChange}
              autoComplete="name"
              minLength={3}
              placeholder={tr("e.g., Md. Rahim Uddin")}
            />
            <p id="contact-name-hint" className="field-hint">
              {/* {tr("3-100 characters; letters, spaces and name punctuation.")} */}
            </p>
            {fieldError("name")}
          </div>
          <div className="form-group">
            <label htmlFor="contact-email">{tr("Email Address *")}</label>
            <input
              type="email"
              {...fieldProps("email")}
              onChange={handleChange}
              autoComplete="email"
              placeholder="Your.email@example.com"
            />
            <p id="contact-email-hint" className="field-hint">
              {tr()
              // "Enter an email address where we can reply (up to 254 characters).",
              }
            </p>
            {fieldError("email")}
          </div>
          <div className="form-group">
            <label htmlFor="contact-phone">{tr("Mobile Number *")}</label>
            <input
              type="tel"
              {...fieldProps("phone")}
              onChange={handleChange}
              autoComplete="tel"
              placeholder="017XXXXXXXX"
            />
            <p id="contact-phone-hint" className="field-hint">
              {tr()
              // "Bangladesh mobile number; 01 or +8801 format. Spaces and hyphens are accepted.",
              }
            </p>
            {fieldError("phone")}
          </div>
          <div className="form-group">
            <label htmlFor="contact-message">{t("common.message")} *</label>
            <textarea
              {...fieldProps("message")}
              aria-describedby={touched.message ? `contact-message-${errors.message ? "error" : "feedback"}` : undefined}
              onChange={handleChange}
              rows="6"
              placeholder={tr("Describe your question or how we can help you")}
            />
            {fieldError("message")}
          </div>
          {feedback && (
            <p
              className={`contact-feedback contact-feedback-${feedback.type}`}
              role={feedback.type === "error" ? "alert" : "status"}
            >
              {tr(feedback.message)}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t("contact.sending") : t("contact.sendMessage")}
          </button>
        </form>
      </section>

      <section className="contact-support-section">
        <div className="container">
          <div className="contact-section-heading">
            <span className="contact-kicker">{t("contact.supportKicker")}</span>
            <h2>{t("contact.supportTitle")}</h2>
          </div>
          <div className="support-grid">
            {supportItems.map((item, index) => (
              <div className="support-card" key={item.title}>
                {item.icon}
                <h3>
                  {t("contact.supportItems", { returnObjects: true })[index]}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="official-contact-section container">
        <div className="contact-section-heading">
          <span className="contact-kicker">{t("contact.directKicker")}</span>
          <h2>{t("contact.directTitle")}</h2>
          <p>{t("contact.directSubtitle")}</p>
        </div>
        <div className="official-contact-grid">
          {contactCards.map((item, index) => (
            <a
              href={`tel:${item.phone.replace(/-/g, "")}`}
              className="official-contact-card"
              key={item.title}
            >
              <FaPhoneAlt />
              <h2>
                {
                  [t("contact.officer"), t("contact.jco"), t("contact.office")][
                    index
                  ]
                }
              </h2>
              <p>{item.phone}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Contact;
