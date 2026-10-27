import FieldFeedback from '../../components/FieldFeedback';
import useFormValidation from '../../hooks/useFormValidation';
import { IDENTITY_LIMITS, validateIdentity, normalizeIdentity } from '../../utils/identityValidation';
import {
  useSiteTranslation,
  translate as tr,
} from "../../hooks/useSiteTranslation";
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../utils/api";
import { toast } from "react-toastify";
import {
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import "./Auth.css";

const Register = () => {
  useSiteTranslation();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { login } = useAuth();
  const [step, setStep] = useState(state?.verificationEmail ? 2 : 1);
  const [formData, setFormData] = useState({
    name: "",
    email: state?.verificationEmail || "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "student",
    referenceCode: "",
    fatherName: "",
    gender: "",
    nidNumber: "",
  });
  const [otp, setOtp] = useState("");
  const [smsAccepted, setSmsAccepted] = useState(null);
  const [resending, setResending] = useState(false);
  const [loading, setLoading] = useState(false);
  const { errors, touched, touch, fieldProps, revealErrors } = useFormValidation(formData, validateIdentity, 'register', loading, IDENTITY_LIMITS);
  const fieldFeedback = name => <FieldFeedback prefix="register" name={name} touched={touched[name]} error={errors[name]} />;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [confirmedInfo, setConfirmedInfo] = useState(false);

  const verificationMessage = tr(
    'A 6-digit code has been sent to your email {{email}} and phone number {{phone}}. The code expires in 10 minutes. Press "Resend Code" to get a new code.',
    {
      email: formData.email,
      phone: formData.phone || tr("your registered phone"),
    },
  );

  const handleChange = (e) => {
    setFormData(previous => ({ ...previous, [e.target.name]: e.target.value }));
    touch(e.target.name);
  };

  // Password strength calculation
  const getPasswordStrength = (password) => {
    if (!password) return { text: "", color: "", percentage: 0 };

    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 15;
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 15;

    if (strength < 40)
      return { text: tr("Weak"), color: "#dc3545", percentage: strength };
    if (strength < 70)
      return { text: tr("Medium"), color: "#ffc107", percentage: strength };
    return { text: tr("Strong"), color: "#28a745", percentage: strength };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;
    const validationErrors = revealErrors();
    if (Object.keys(validationErrors).length) {
      toast.error(tr(validationErrors[Object.keys(validationErrors)[0]]));
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      toast.error(tr("Password must be at least 8 characters"));
      return;
    }

    if (!/[A-Z]/.test(formData.password)) {
      toast.error(tr("Password must contain at least one uppercase letter"));
      return;
    }

    if (!/[0-9]/.test(formData.password)) {
      toast.error(tr("Password must contain at least one number"));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error(tr("Passwords do not match"));
      return;
    }

    if (formData.role === "instructor" && !formData.referenceCode.trim()) {
      toast.error(tr("Instructor reference code is required"));
      return;
    }

    // Check agreements
    if (!agreedToTerms || !confirmedInfo) {
      toast.error(tr("Please agree to the terms and confirm your information"));
      return;
    }

    setLoading(true);
    try {
      const { fatherName, nidNumber, ...accountData } = formData;
      const normalizedAccount = { ...accountData, ...normalizeIdentity(formData) };
      const payload = formData.role === "student"
        ? { ...normalizedAccount, fatherName, nidNumber }
        : normalizedAccount;
      const { data } = await authAPI.register(payload);
      setSmsAccepted(data.smsAccepted);
      toast.success(verificationMessage);
      setStep(2);
    } catch (error) {
      toast.error(
        tr(error.response?.data?.message || tr("Registration failed")),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await authAPI.verifyOTP({ email: formData.email, otp });
      if (data.user?.role === "student" && data.token) {
        login(data.token, data.user, true);
        navigate("/student-dashboard", { replace: true });
      } else {
        toast.success(tr("Registration verified! You can now login."));
        navigate("/login", { replace: true });
      }
    } catch (error) {
      toast.error(
        tr(error.response?.data?.message || tr("OTP verification failed")),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    try {
      const { data } = await authAPI.resendOTP({ email: formData.email });
      setOtp("");
      setSmsAccepted(data.smsAccepted);
      toast.success(verificationMessage);
    } catch (error) {
      toast.error(
        tr(
          error.response?.data?.message ||
            tr("Failed to resend the verification code"),
        ),
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>{tr("Create Account")}</h1>

        {step === 1 ? (
          <form onSubmit={handleRegister} className="auth-form validated-form" noValidate>
            {/* Basic Information */}
            <h3
              style={{
                fontSize: "1.1rem",
                marginBottom: "1rem",
                color: "var(--primary-color)",
              }}
            >
              {tr("📋 Basic Information")}
            </h3>

            <div className="form-group">
              <label htmlFor="register-name">{tr("Full Name *")}</label>
              <input type="text" {...fieldProps('name')} onChange={handleChange} autoComplete="name" placeholder={tr("e.g., Md. Rahim Uddin")} />
              {/* <p id="register-name-hint" className="field-hint">{tr('3-100 characters; letters, spaces and name punctuation.')}</p> */}
              {fieldFeedback('name')}
            </div>
            <div className="form-group">
              <label htmlFor="register-email">{tr("Email Address *")}</label>
              <input type="email" {...fieldProps('email')} onChange={handleChange} autoComplete="email" placeholder="your.email@example.com" />
              {/* <p id="register-email-hint" className="field-hint">{tr('Enter an email address where we can reply (up to 254 characters).')} {tr("Used for login and OTP verification")}</p> */}
              {fieldFeedback('email')}
            </div>
            <div className="form-group">
              <label htmlFor="register-phone">{tr("Mobile Number *")}</label>
              <input type="tel" {...fieldProps('phone')} onChange={handleChange} autoComplete="tel" placeholder="01712345678" />
              {/* <p id="register-phone-hint" className="field-hint">{tr('Bangladesh mobile number; 01 or +8801 format. Spaces and hyphens are accepted.')}</p> */}
              {fieldFeedback('phone')}
            </div>
            {/* Role Selection */}
            <h3
              style={{
                fontSize: "1.1rem",
                margin: "1.5rem 0 1rem",
                color: "var(--primary-color)",
              }}
            >
              {tr("👤 Role Selection")}
            </h3>

            {formData.role === "student" && (
              <>
                <div className="form-group">
                  <label htmlFor="register-gender">{tr("Gender")}</label>
                  <select id="register-gender" name="gender" className="form-control" value={formData.gender} onChange={handleChange}>
                    <option value="">{tr("Select gender")}</option>
                    <option value="male">{tr("Male")}</option>
                    <option value="female">{tr("Female")}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="father-name">{tr("Father’s Name")}</label>
                  <input
                    id="father-name"
                    type="text"
                    name="fatherName"
                    className="form-control"
                    value={formData.fatherName}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="nid-number">{tr("NID Number")}</label>
                  <input
                    id="nid-number"
                    type="text"
                    name="nidNumber"
                    className="form-control"
                    value={formData.nidNumber}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            {formData.role === "instructor" && (
              <div className="form-group">
                <label>{tr("Instructor Reference Code *")}</label>
                <input
                  type="text"
                  name="referenceCode"
                  className="form-control"
                  placeholder={tr("Enter admin-provided reference code")}
                  value={formData.referenceCode}
                  onChange={handleChange}
                  required
                />
                <small style={{ color: "#666" }}>
                  {tr(
                    "This code is provided by the admin and can be used once.",
                  )}
                </small>
              </div>
            )}

            {/* Account Security */}
            <h3
              style={{
                fontSize: "1.1rem",
                margin: "1.5rem 0 1rem",
                color: "var(--primary-color)",
              }}
            >
              {tr("🔒 Account Security")}
            </h3>

            <div className="form-group">
              <label>{tr("Password *")}</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="form-control"
                  placeholder={tr("Min. 8 characters, 1 uppercase, 1 number")}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength="8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#666",
                  }}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div style={{ marginTop: "0.5rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <small
                      style={{
                        fontWeight: "bold",
                        color: passwordStrength.color,
                      }}
                    >
                      {passwordStrength.text}
                    </small>
                    <small style={{ color: "#666" }}>
                      {passwordStrength.percentage}%
                    </small>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "6px",
                      background: "#e0e0e0",
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${passwordStrength.percentage}%`,
                        height: "100%",
                        background: passwordStrength.color,
                        transition: "all 0.3s",
                      }}
                    />
                  </div>
                  <div style={{ marginTop: "0.5rem" }}>
                    <small
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        color:
                          formData.password.length >= 8 ? "#28a745" : "#999",
                      }}
                    >
                      {formData.password.length >= 8 ? (
                        <FaCheckCircle />
                      ) : (
                        <FaTimesCircle />
                      )}
                      {tr("At least 8 characters")}
                    </small>
                    <small
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        color: /[A-Z]/.test(formData.password)
                          ? "#28a745"
                          : "#999",
                      }}
                    >
                      {/[A-Z]/.test(formData.password) ? (
                        <FaCheckCircle />
                      ) : (
                        <FaTimesCircle />
                      )}
                      {tr("At least 1 uppercase letter")}
                    </small>
                    <small
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        color: /[0-9]/.test(formData.password)
                          ? "#28a745"
                          : "#999",
                      }}
                    >
                      {/[0-9]/.test(formData.password) ? (
                        <FaCheckCircle />
                      ) : (
                        <FaTimesCircle />
                      )}
                      {tr("At least 1 number")}
                    </small>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>{tr("Confirm Password *")}</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  className="form-control"
                  placeholder={tr("Re-enter your password")}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#666",
                  }}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {formData.confirmPassword && (
                <small
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    marginTop: "0.5rem",
                    color:
                      formData.password === formData.confirmPassword
                        ? "#28a745"
                        : "#dc3545",
                  }}
                >
                  {formData.password === formData.confirmPassword ? (
                    <FaCheckCircle />
                  ) : (
                    <FaTimesCircle />
                  )}
                  {formData.password === formData.confirmPassword
                    ? tr("Passwords match")
                    : tr("Passwords do not match")}
                </small>
              )}
            </div>

            <div className="form-group">
              <label>{tr("I am registering as *")}</label>
              <div
                style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}
              >
                <label
                  style={{
                    flex: 1,
                    padding: "1rem",
                    border: `2px solid ${formData.role === "student" ? "var(--primary-color)" : "#ddd"}`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    background:
                      formData.role === "student" ? "#e3f2fd" : "white",
                    transition: "all 0.3s",
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value="student"
                    checked={formData.role === "student"}
                    onChange={handleChange}
                    style={{ marginRight: "0.5rem" }}
                  />
                  <strong>{tr("Student")}</strong>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "#666",
                      marginTop: "0.25rem",
                    }}
                  >
                    {tr("Enroll in courses and learn")}
                  </div>
                </label>
                <label
                  style={{
                    flex: 1,
                    padding: "1rem",
                    border: `2px solid ${formData.role === "instructor" ? "var(--primary-color)" : "#ddd"}`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    background:
                      formData.role === "instructor" ? "#e3f2fd" : "white",
                    transition: "all 0.3s",
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value="instructor"
                    checked={formData.role === "instructor"}
                    onChange={handleChange}
                    style={{ marginRight: "0.5rem" }}
                  />
                  <strong>{tr("Instructor")}</strong>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "#666",
                      marginTop: "0.25rem",
                    }}
                  >
                    {tr("Teach and manage courses")}
                  </div>
                </label>
              </div>
            </div>

            {/* Agreement & Consent */}
            <h3
              style={{
                fontSize: "1.1rem",
                margin: "1.5rem 0 1rem",
                color: "var(--primary-color)",
              }}
            >
              {tr("✅ Agreement & Consent")}
            </h3>

            <div
              style={{
                background: "#f8f9fa",
                padding: "1rem",
                borderRadius: "8px",
                border: "1px solid #ddd",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "start",
                  gap: "0.75rem",
                  cursor: "pointer",
                  marginBottom: "0.75rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  style={{ marginTop: "0.25rem" }}
                />
                <span>
                  {tr("I agree to the")}{" "}
                  <Link
                    to="/terms"
                    target="_blank"
                    style={{ color: "var(--primary-color)" }}
                  >
                    {tr("Terms & Conditions")}
                  </Link>{" "}
                  {tr("and")}{" "}
                  <Link
                    to="/privacy"
                    target="_blank"
                    style={{ color: "var(--primary-color)" }}
                  >
                    {tr("Privacy Policy")}
                  </Link>
                </span>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "start",
                  gap: "0.75rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={confirmedInfo}
                  onChange={(e) => setConfirmedInfo(e.target.checked)}
                  style={{ marginTop: "0.25rem" }}
                />
                <span>
                  {tr(
                    "I confirm that all the information provided is correct and accurate",
                  )}
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading || !agreedToTerms || !confirmedInfo}
              style={{
                marginTop: "1.5rem",
                opacity: !agreedToTerms || !confirmedInfo ? 0.6 : 1,
                cursor:
                  !agreedToTerms || !confirmedInfo ? "not-allowed" : "pointer",
              }}
            >
              {loading
                ? tr("Creating Account...")
                : tr("Send Verification Code")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="auth-form">
            <p className="otp-info">{verificationMessage}</p>

            {smsAccepted === false && (
              <p role="status">
                {tr(
                  "SMS is currently unavailable. Please use the code from your email.",
                )}
              </p>
            )}
            <div className="form-group">
              <label htmlFor="email-otp">
                {tr("Verification code (email or SMS)")}
              </label>
              <input
                type="text"
                className="form-control"
                id="email-otp"
                inputMode="numeric"
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                maxLength="6"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading || resending}
            >
              {loading
                ? tr("Verifying...")
                : tr("Verify & Complete Registration")}
            </button>

            <button
              type="button"
              onClick={handleResendOTP}
              disabled={loading || resending}
              className="btn btn-secondary btn-block"
              style={{ marginTop: "10px" }}
            >
              {resending ? tr("Sending...") : tr("Resend Code")}
            </button>
          </form>
        )}

        <p className="auth-link">
          {tr("Already have an account?")}{" "}
          <Link to="/login">{tr("Login here")}</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
