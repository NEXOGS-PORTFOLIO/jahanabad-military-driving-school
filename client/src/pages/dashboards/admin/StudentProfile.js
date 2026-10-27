import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import api, { resolveAssetUrl } from '../../../utils/api';
import { translate as tr, useSiteTranslation } from '../../../hooks/useSiteTranslation';
import './StudentProfile.css';

const StudentProfile = ({ student, onClose }) => {
  const { locale } = useSiteTranslation();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const closeButton = useRef(null);
  const mounted = useRef(true);
  const date = value => value ? new Date(value).toLocaleString(locale) : tr('N/A');
  const value = item => item === undefined || item === null || item === '' ? tr('Not provided') : item;

  useEffect(() => {
    let active = true;
    api.get(`/users/${student._id}/student-profile`).then(response => {
      if (active) setProfile(response.data.data);
    }).catch(() => { if (active) setError(tr('Unable to load student profile')); });
    return () => { active = false; };
  }, [student._id]);

  useEffect(() => {
    mounted.current = true;
    const previousFocus = document.activeElement;
    closeButton.current?.focus();
    return () => { mounted.current = false; previousFocus?.focus(); };
  }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  const openDocument = async (field, download) => {
    setBusy(true);
    try {
      const response = await api.get(`/users/${student._id}/documents/${field}`, {
        responseType: 'blob', params: { download: download ? '1' : '0' }
      });
      if (!mounted.current) return;
      const metadata = profile.documents[field];
      const url = URL.createObjectURL(new Blob([response.data], { type: metadata.contentType }));
      if (download) {
        const link = document.createElement('a');
        link.href = url;
        link.download = metadata.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else setPreview({ url, ...metadata });
    } catch (_) { toast.error(tr('Unable to load student document')); }
    finally { if (mounted.current) setBusy(false); }
  };

  const handleKeyDown = event => {
    if (event.key === 'Escape') onClose();
    if (event.key === 'Tab') {
      const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled), a[href], iframe, summary, [tabindex="0"]')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  };
  const details = entries => <dl className="student-profile-details">{entries.map(([label, item]) =>
    <div key={label}><dt>{tr(label)}</dt><dd>{value(item)}</dd></div>)}</dl>;

  return <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content student-profile" role="dialog" aria-modal="true" aria-labelledby="student-profile-title"
      onClick={event => event.stopPropagation()} onKeyDown={handleKeyDown}>
      <div className="modal-header">
        <h2 id="student-profile-title">{tr('Student Profile')}: {student.name}</h2>
        <button ref={closeButton} type="button" className="close-btn" onClick={onClose} aria-label={tr('Close student profile')}>×</button>
      </div>
      {error ? <p role="alert">{error}</p> : !profile ? <p role="status">{tr('Loading...')}</p> : <>
        <section><h3>{tr('Personal Information')}</h3>
          {profile.avatar?.url && <img className="student-profile-avatar" src={resolveAssetUrl(profile.avatar.url)} alt={profile.name} />}
          {details([
            ['Name', profile.name], ['Email', profile.email], ['Phone', profile.phone],
            ['Father’s Name', profile.fatherName], ['NID Number', profile.nidNumber],
            ['Student ID', profile._id], ['Role', tr(profile.role)], ['Account Status', tr(profile.status)],
            ['Account Verified', profile.isVerified ? tr('Yes') : tr('No')],
            ['Phone Verified', profile.phoneVerified ? tr('Yes') : tr('No')],
            ['Registered At', date(profile.createdAt)], ['Last Updated', date(profile.updatedAt)]
          ])}
        </section>
        <section><h3>{tr('Submitted Documents')}</h3>
          {['nidDocument', 'biodataDocument'].map(field => <div className="student-document" key={field}>
            <div><strong>{tr(field === 'nidDocument' ? 'NID Document' : 'Biodata Document')}</strong>
              <p>{profile.documents?.[field]?.filename || tr('Not submitted')}</p></div>
            {profile.documents?.[field] && <div className="student-document-actions">
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => openDocument(field, false)}>{tr('View')}</button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => openDocument(field, true)}>{tr('Download')}</button>
            </div>}
          </div>)}
          {preview && <div className="student-document-preview">
            <div className="student-document"><strong>{preview.filename}</strong>
              <button type="button" className="btn btn-secondary" onClick={() => setPreview(null)}>{tr('Close preview')}</button></div>
            {preview.contentType === 'application/pdf'
              ? <object data={preview.url} type="application/pdf" aria-label={preview.filename}><p>{tr('PDF preview is unavailable. Use Download to review this document.')}</p></object>
              : <img src={preview.url} alt={preview.filename} />}
          </div>}
        </section>
        <section><h3>{tr('Enrollments & Training')}</h3>
          {student.enrollments.length === 0 && <p>{tr('No enrollments found.')}</p>}
          {student.enrollments.map(enrollment => <article key={enrollment._id} className="student-training-record">
            <h4>{enrollment.course?.title || tr('N/A')} · {enrollment.batch?.batchNumber || tr('Unassigned')}</h4>
            {details([
              ['Enrollment ID', enrollment._id], ['Status', tr(enrollment.status)],
              ['Instructor', enrollment.instructor?.name], ['Instructor Email', enrollment.instructor?.email],
              ['Batch Status', enrollment.batch?.status && tr(enrollment.batch.status)],
              ['Batch Start', date(enrollment.batch?.startDate)], ['Batch End', date(enrollment.batch?.endDate)],
              ['Payment Status', enrollment.paymentStatus && tr(enrollment.paymentStatus)],
              ['Document Status', enrollment.documentStatus && tr(enrollment.documentStatus)],
              ['Progress', `${enrollment.progress || 0}%`], ['Enrolled At', date(enrollment.enrolledAt)],
              ['Approved At', date(enrollment.approvedAt)], ['Completed At', date(enrollment.completedAt)],
              ['Notes', enrollment.notes]
            ])}
            <details><summary>{tr('Attendance')} ({enrollment.attendance?.length || 0})</summary>
              {enrollment.attendance?.length ? <ul>{enrollment.attendance.map((entry, index) =>
                <li key={entry._id || index}>{date(entry.date)} — {tr(entry.status)}</li>)}</ul> : <p>{tr('No attendance records.')}</p>}
            </details>
            <details><summary>{tr('Progress Comments')} ({enrollment.progressComments?.length || 0})</summary>
              {enrollment.progressComments?.length ? enrollment.progressComments.map((comment, index) => <div key={comment._id || index}>
                <p><strong>{comment.authorName}</strong> · {date(comment.createdAt)} · {comment.progress}%</p><p>{comment.text}</p>
              </div>) : <p>{tr('No progress comments.')}</p>}
            </details>
          </article>)}
        </section>
        <section><h3>{tr('Certificates')}</h3>
          {student.certificates.length === 0 && <p>{tr('No certificates found.')}</p>}
          {student.certificates.map(certificate => <article className="student-training-record" key={certificate._id}>
            {details([
              ['Certificate ID', certificate.certificateId], ['Course', certificate.course?.title],
              ['Batch', certificate.batch?.batchNumber], ['Status', tr(certificate.status)],
              ['Issued At', date(certificate.issuedDate)], ['Revoked At', date(certificate.revokedAt)],
              ['Revocation Reason', certificate.revokeReason]
            ])}
          </article>)}
        </section>
      </>}
    </div>
  </div>;
};

export default StudentProfile;
