import { useSiteTranslation, translate as tr } from '../hooks/useSiteTranslation';
import { useEffect, useRef } from 'react';
import './RegistrationSuccess.css';

export default function EnrollmentSuccess({ confirmation, onClose }) {
  useSiteTranslation();
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current.showModal();
  }, []);

  return (
    <dialog ref={dialog} className="registration-success" aria-labelledby="enrollment-success-title"
      aria-describedby="enrollment-success-message enrollment-success-contact" onCancel={onClose}>
      <h2 id="enrollment-success-title">{confirmation.studentName
        ? tr('Dear {{name}},', { name: confirmation.studentName })
        : tr('Enrollment successful')}</h2>
      <p id="enrollment-success-message">{confirmation.courseName
        ? tr('You have successfully enrolled in “{{course}}”. Please contact us at the following address for the next steps.', { course: confirmation.courseName })
        : tr('Your enrollment was successful. Please contact us at the following address for the next steps.')}</p>
      <p id="enrollment-success-contact">
        <strong>{tr("Contact No.:")}</strong> <a href={`tel:${confirmation.contactNumber}`}>{confirmation.contactNumber}</a><br />
        <strong>{tr("Address:")}</strong> {tr(confirmation.address)}
      </p>
      <div className="registration-success-actions">
        <button type="button" className="btn btn-primary" autoFocus onClick={onClose}>{tr("Close")}</button>
      </div>
    </dialog>
  );
}
