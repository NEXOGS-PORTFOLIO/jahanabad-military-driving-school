import { useSiteTranslation, translate as tr } from '../../../hooks/useSiteTranslation';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import { FaUser, FaEnvelope, FaPhoneAlt, FaIdCard, FaUserShield, FaCalendarAlt, FaCheckCircle, FaClock, FaEdit, FaLock, FaTimes } from 'react-icons/fa';
import api, { resolveAssetUrl } from '../../../utils/api';
import './ProfileSection.css';

const profileValues = user => ({
  name: user?.name || '', email: user?.email || '', phone: user?.phone || '',
  gender: user?.gender || '', fatherName: user?.fatherName || ''
});

const ProfileDialog = ({ title, busy, onClose, children }) => {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog ref={dialog} className="profile-dialog" aria-labelledby="profile-dialog-title"
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
      onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div className="profile-dialog-inner">
        <div className="profile-dialog-heading">
          <h2 id="profile-dialog-title">{title}</h2>
          <button type="button" className="profile-close" aria-label={tr('Close')} disabled={busy} onClick={onClose}><FaTimes aria-hidden="true" /></button>
        </div>
        {children}
      </div>
    </dialog>
  );
};

const ProfileSection = () => {
  const { locale } = useSiteTranslation();
  const { user, setUser } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [formData, setFormData] = useState(() => profileValues(user));
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [failedAvatar, setFailedAvatar] = useState(null);

  const openEdit = () => { setFormData(profileValues(user)); setShowEditModal(true); };
  const closePassword = () => {
    setShowPasswordModal(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };
  const handleUpdateProfile = async event => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const response = await api.put('/auth/me', formData);
      setUser(response.data.data);
      toast.success(tr('Profile updated successfully'));
      setShowEditModal(false);
    } catch (error) {
      toast.error(tr(error.response?.data?.message || 'Failed to update profile'));
    } finally { setSaving(false); }
  };
  const handleChangePassword = async event => {
    event.preventDefault();
    if (changingPassword) return;
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(tr('Passwords do not match'));
      return;
    }
    setChangingPassword(true);
    try {
      await api.put('/auth/change-password', { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
      toast.success(tr('Password changed successfully'));
      closePassword();
    } catch (error) {
      toast.error(tr(error.response?.data?.message || 'Failed to change password'));
    } finally { setChangingPassword(false); }
  };

  if (!user) return <div className="profile-dashboard"><p>{tr('Loading...')}</p></div>;

  const missing = tr('Not Set');
  const initials = user.name?.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]).join('').toUpperCase() || '?';
  const avatarUrl = user.avatar?.url ? resolveAssetUrl(user.avatar.url) : null;
  const roles = { student: tr('Student'), instructor: tr('Instructor'), admin: tr('Admin') };
  const statuses = { active: tr('Active'), inactive: tr('Inactive'), suspended: tr('Suspended') };
  const role = roles[user.role] || user.role || missing;
  const accountStatus = statuses[user.status] || user.status || missing;
  const gender = user.gender === 'male' ? tr('Male') : user.gender === 'female' ? tr('Female') : missing;
  const date = value => {
    if (!value || Number.isNaN(new Date(value).getTime())) return missing;
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' }).format(new Date(value));
  };
  const verification = value => (
    <span className={`profile-verification ${value === true ? 'is-verified' : ''}`}>
      {value === true ? <FaCheckCircle aria-hidden="true" /> : <FaClock aria-hidden="true" />}
      {value === true ? tr('Verified') : value === false ? tr('Not Verified') : missing}
    </span>
  );
  const detail = (label, value, extraClass = '') => (
    <div className={`profile-detail ${extraClass}`} key={typeof label === 'string' ? label : extraClass || 'contact-email'}><dt>{label}</dt><dd>{value || missing}</dd></div>
  );
  const change = event => setFormData(current => ({ ...current, [event.target.name]: event.target.value }));

  return (
    <section className="profile-dashboard" aria-labelledby="my-profile-heading">
      <header className="profile-page-heading">
        <div><p className="profile-eyebrow">{tr('Your account')}</p><h1 id="my-profile-heading">{tr('My Profile')}</h1><p>{tr('View and manage your personal details and account settings.')}</p></div>
        <button className="btn btn-primary" onClick={openEdit}><FaEdit aria-hidden="true" />{tr('Edit Profile')}</button>
      </header>

      <div className="profile-overview">
        <div className="profile-identity">
          <div className="profile-avatar">
            {avatarUrl && failedAvatar !== avatarUrl ? <img src={avatarUrl} alt={user.name || tr('Full Name')} onError={() => setFailedAvatar(avatarUrl)} /> : <span aria-hidden="true">{initials}</span>}
          </div>
          <div className="profile-identity-text"><span className="profile-role">{role}</span><h2>{user.name || missing}</h2><p>{user.email || missing}</p></div>
        </div>
        <div className="profile-overview-meta">
          <div><span>{tr('Account Status')}</span><span className={`profile-status ${['active', 'inactive', 'suspended'].includes(user.status) ? user.status : 'unknown'}`}><i aria-hidden="true" />{accountStatus}</span></div>
          <div><span>{tr('Member since')}</span><strong><FaCalendarAlt aria-hidden="true" />{date(user.createdAt)}</strong></div>
        </div>
      </div>

      <div className="profile-info-grid">
        <article className="profile-card">
          <div className="profile-card-heading"><span className="profile-card-icon"><FaUser aria-hidden="true" /></span><div><h2>{tr('Personal details')}</h2><p>{tr('Your identity and registration information.')}</p></div></div>
          <dl className="profile-details">
            {detail(tr('Full Name'), user.name)}
            {detail(tr('Father’s Name'), user.fatherName)}
            {detail(tr('Gender'), gender)}
            {detail(tr('NID Number'), user.nidNumber, 'profile-number')}
          </dl>
        </article>
        <article className="profile-card">
          <div className="profile-card-heading"><span className="profile-card-icon"><FaIdCard aria-hidden="true" /></span><div><h2>{tr('Contact information')}</h2><p>{tr('The contact details saved to your account.')}</p></div></div>
          <dl className="profile-details profile-contact-details">
            {detail(<><FaEnvelope aria-hidden="true" />{tr('Email Address')}</>, user.email)}
            {detail(<><FaPhoneAlt aria-hidden="true" />{tr('Phone Number')}</>, user.phone, 'profile-number')}
          </dl>
          <div className="profile-contact-note"><FaLock aria-hidden="true" /><p>{tr('Keep your contact information up to date to receive school updates.')}</p></div>
        </article>
        <article className="profile-card profile-account-card">
          <div className="profile-card-heading"><span className="profile-card-icon"><FaUserShield aria-hidden="true" /></span><div><h2>{tr('Account details')}</h2><p>{tr('Your account access and verification status.')}</p></div></div>
          <dl className="profile-details profile-account-details">
            {detail(tr('Role'), role)}
            {detail(tr('Account Status'), accountStatus)}
            {detail(tr('Account verification'), verification(user.isVerified))}
            {detail(tr('Member since'), date(user.createdAt))}
            {detail(tr('Last updated'), date(user.updatedAt))}
            {detail(tr('Account ID'), user._id, 'profile-account-id')}
          </dl>
        </article>
      </div>

      <article className="profile-security">
        <span className="profile-card-icon"><FaLock aria-hidden="true" /></span>
        <div><h2>{tr('Password & security')}</h2><p>{tr('Protect your account with a strong, unique password.')}</p></div>
        <button className="btn btn-secondary" onClick={() => setShowPasswordModal(true)}><FaLock aria-hidden="true" />{tr('Change Password')}</button>
      </article>

      {showEditModal && <ProfileDialog title={tr('Edit Profile')} busy={saving} onClose={() => setShowEditModal(false)}>
        <p className="profile-dialog-description">{tr('Update your personal and contact information.')}</p>
        <form onSubmit={handleUpdateProfile}>
          <fieldset disabled={saving} className="profile-form-grid">
            <div className="profile-form-field"><label htmlFor="profile-name">{tr('Full Name')}</label><input id="profile-name" name="name" type="text" autoComplete="name" value={formData.name} onChange={change} required /></div>
            <div className="profile-form-field"><label htmlFor="profile-father-name">{tr('Father’s Name')}</label><input id="profile-father-name" name="fatherName" type="text" value={formData.fatherName} onChange={change} /></div>
            <div className="profile-form-field"><label htmlFor="profile-email">{tr('Email Address')}</label><input id="profile-email" name="email" type="email" autoComplete="email" value={formData.email} onChange={change} required /></div>
            <div className="profile-form-field"><label htmlFor="profile-phone">{tr('Phone Number')}</label><input id="profile-phone" name="phone" type="tel" autoComplete="tel" value={formData.phone} onChange={change} /></div>
            <div className="profile-form-field"><label htmlFor="profile-gender">{tr('Gender')}</label><select id="profile-gender" name="gender" value={formData.gender} onChange={change}><option value="">{tr('Select gender')}</option><option value="male">{tr('Male')}</option><option value="female">{tr('Female')}</option></select></div>
          </fieldset>
          <div className="profile-form-actions"><button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setShowEditModal(false)}>{tr('Cancel')}</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? tr('Saving...') : tr('Update Profile')}</button></div>
        </form>
      </ProfileDialog>}

      {showPasswordModal && <ProfileDialog title={tr('Change Password')} busy={changingPassword} onClose={closePassword}>
        <p className="profile-dialog-description">{tr('Use at least 6 characters for your new password.')}</p>
        <form onSubmit={handleChangePassword}>
          <fieldset disabled={changingPassword} className="profile-form-grid profile-password-fields">
            {[
              { name: 'currentPassword', label: tr('Current Password'), autoComplete: 'current-password' },
              { name: 'newPassword', label: tr('New Password'), autoComplete: 'new-password', minLength: 6 },
              { name: 'confirmPassword', label: tr('Confirm New Password'), autoComplete: 'new-password', minLength: 6 }
            ].map(field => <div className="profile-form-field" key={field.name}><label htmlFor={`profile-${field.name}`}>{field.label}</label><input id={`profile-${field.name}`} type="password" autoComplete={field.autoComplete} minLength={field.minLength} value={passwordData[field.name]} onChange={event => setPasswordData(current => ({ ...current, [field.name]: event.target.value }))} required /></div>)}
          </fieldset>
          <div className="profile-form-actions"><button type="button" className="btn btn-secondary" disabled={changingPassword} onClick={closePassword}>{tr('Cancel')}</button><button type="submit" className="btn btn-primary" disabled={changingPassword}>{changingPassword ? tr('Saving...') : tr('Change Password')}</button></div>
        </form>
      </ProfileDialog>}
    </section>
  );
};

export default ProfileSection;
