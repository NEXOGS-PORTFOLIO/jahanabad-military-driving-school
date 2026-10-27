import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../../utils/api';
import { translate as tr } from '../../../hooks/useSiteTranslation';
import './StudentProfile.css';
import { FaFileAlt, FaCloudUploadAlt, FaEye, FaTrashAlt, FaUndo, FaTimes } from 'react-icons/fa';
import './EnrollmentDocuments.css';

const fields = ['nidDocument', 'biodataDocument'];
const EnrollmentDocuments = ({ enrollment, onClose }) => {
  const [documents, setDocuments] = useState(null);
  const [files, setFiles] = useState({});
  const [removals, setRemovals] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const dialog = useRef(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    const previous = document.activeElement;
    dialog.current?.querySelector('button')?.focus();
    api.get(`/users/${enrollment.student._id}/student-profile`)
      .then(response => { if (active.current) setDocuments(response.data.data.documents); })
      .catch(() => { if (active.current) setError(tr('Unable to load student documents')); });
    return () => { active.current = false; previous?.focus(); };
  }, [enrollment.student._id]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  const save = async event => {
    event.preventDefault();
    const data = new FormData();
    for (const field of fields) if (files[field]) data.append(field, files[field]);
    for (const field of fields) if (removals[field]) data.append(`remove_${field}`, 'true');
    setBusy(true);
    setError('');
    try {
      await api.put(`/enrollments/${enrollment._id}/documents`, data);
      toast.success(tr('Student documents saved successfully'));
      onClose();
    } catch (failure) {
      if (active.current) setError(failure.response?.data?.message || tr('Unable to upload student documents'));
    } finally { if (active.current) setBusy(false); }
  };
  const view = async field => {
    setBusy(true);
    try {
      const response = await api.get(`/users/${enrollment.student._id}/documents/${field}`, { responseType: 'blob' });
      if (active.current) setPreview({ ...documents[field], url: URL.createObjectURL(new Blob([response.data], { type: documents[field].contentType })) });
    } catch (_) { toast.error(tr('Unable to load student document')); }
    finally { if (active.current) setBusy(false); }
  };
  const keyDown = event => {
    if (event.key === 'Escape' && !busy) onClose();
    if (event.key !== 'Tab') return;
    const controls = [...dialog.current.querySelectorAll('button:not(:disabled), input:not(:disabled), object')];
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return <div className="modal-overlay" onClick={() => { if (!busy) onClose(); }}>
    <div ref={dialog} className="modal-content student-profile enrollment-documents" role="dialog" aria-modal="true" aria-labelledby="enrollment-documents-title"
      onKeyDown={keyDown} onClick={event => event.stopPropagation()}>
      <div className="modal-header"><div><span className="document-eyebrow">{tr('Enrollment verification')}</span><h2 id="enrollment-documents-title">{tr('Student Documents')}</h2><p className="document-student-name">{enrollment.student.name}</p></div>
        <button type="button" className="close-btn" aria-label={tr('Close')} disabled={busy} onClick={onClose}>&times;</button></div>
      {error && <p className="document-error" role="alert">{error}</p>}
      {!documents ? <p role="status">{tr('Loading...')}</p> : <form onSubmit={save}>
        <div className="document-cards">{fields.map(field => <div className={`document-card${removals[field] ? ' document-card-removing' : ''}`} key={field}>
          <div className="document-card-heading"><span className="document-icon"><FaFileAlt /></span><h3>{tr(field === 'nidDocument' ? 'NID Document' : 'Biodata Document')}</h3>
            <span className={`document-status${removals[field] ? ' removing' : ''}`}>{tr(removals[field] ? 'Removal pending' : files[field] ? 'Ready to upload' : documents[field] ? 'Uploaded' : 'Not uploaded')}</span></div>
          {documents[field] && <div className="document-existing"><span className="document-filename">{documents[field].filename}</span>
            <div className="document-row-actions"><button type="button" className="document-action" disabled={busy || removals[field]} onClick={() => view(field)}><FaEye />{tr('View')}</button>
              <button type="button" className={`document-action${removals[field] ? '' : ' document-remove'}`} disabled={busy} onClick={() => {
                setRemovals(previous => ({ ...previous, [field]: !previous[field] }));
                setFiles(previous => ({ ...previous, [field]: null }));
                const input = dialog.current.querySelector(`#${field}`);
                if (input) input.value = '';
                setPreview(null);
              }}>{removals[field] ? <FaUndo /> : <FaTrashAlt />}{tr(removals[field] ? 'Undo' : 'Remove')}</button></div></div>}
          {removals[field] ? <p className="document-removal-note">{tr('This document will be removed when you save changes.')}</p> : <div className="document-upload-area">
          <label className="document-file-picker" htmlFor={field}><FaCloudUploadAlt /><span>{tr(documents[field] ? 'Choose replacement' : 'Choose file')}</span>
          <input id={field} type="file" accept=".png,.jpg,.jpeg,.pdf" disabled={busy}
            aria-describedby={`${field}-help`} onChange={event => {
              const file = event.target.files[0];
              setError('');
              if (file && (file.size > 5 * 1024 * 1024 || !/\.(png|jpe?g|pdf)$/i.test(file.name) || !['image/png', 'image/jpeg', 'application/pdf'].includes(file.type))) {
                setError(tr('Choose a PNG, JPG, JPEG or PDF file, maximum 5 MB.'));
                event.target.value = '';
                setFiles(previous => ({ ...previous, [field]: null }));
              } else setFiles(previous => ({ ...previous, [field]: file }));
            }} /></label>
          {files[field] ? <div className="document-selection"><span className="document-filename">{files[field].name}</span><button type="button" className="document-action" aria-label={tr('Clear selected file')} disabled={busy} onClick={() => {
            setFiles(previous => ({ ...previous, [field]: null }));
            dialog.current.querySelector(`#${field}`).value = '';
          }}><FaTimes /></button></div> : <span className="document-upload-hint">{tr('Select a document to upload')}</span>}
          <small id={`${field}-help`}>{tr('PNG, JPG, JPEG or PDF. Maximum 5 MB per document.')}</small>
          </div>}
        </div>)}</div>
        <p className="document-save-note">{tr('Documents are shared with the student profile. Uploads and removals take effect when you save.')}</p>
        <div className="form-actions"><button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>{tr('Cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={busy || !(Object.values(files).some(Boolean) || Object.values(removals).some(Boolean))}>{tr(busy ? 'Saving...' : 'Save Changes')}</button></div>
      </form>}
      {preview && <div className="student-document-preview">
        <div className="student-document"><strong>{preview.filename}</strong><button type="button" className="btn btn-secondary" onClick={() => setPreview(null)}>{tr('Close preview')}</button></div>
        {preview.contentType === 'application/pdf' ? <object data={preview.url} type="application/pdf" aria-label={preview.filename} /> : <img src={preview.url} alt={preview.filename} />}
      </div>}
    </div>
  </div>;
};
export default EnrollmentDocuments;
