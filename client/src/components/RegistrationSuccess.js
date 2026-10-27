import { useSiteTranslation, translate as tr } from '../hooks/useSiteTranslation';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './RegistrationSuccess.css';

export default function RegistrationSuccess() {
  useSiteTranslation();
  const { user, registrationSuccess, clearRegistrationSuccess } = useAuth();
  const [visible, setVisible] = useState(() =>
    user?.role === 'student' && !!registrationSuccess && registrationSuccess === user._id
  );
  const dialog = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (visible) {
      clearRegistrationSuccess();
      dialog.current.showModal();
    }
  }, [visible, clearRegistrationSuccess]);

  if (!visible) return null;

  const dismiss = () => {
    dialog.current.close();
    setVisible(false);
  };

  return (
    <dialog ref={dialog} className="registration-success" aria-labelledby="registration-success-title"
      aria-describedby="registration-success-message" onCancel={dismiss}>
      <h2 id="registration-success-title">{tr('Dear {{name}},', { name: user.name })}</h2>
      <p id="registration-success-message">
        {tr('Your registration was successful. Please enroll in your preferred course.')}
      </p>
      <div className="registration-success-actions">
        <button type="button" className="btn btn-primary" autoFocus onClick={() => {
          dismiss();
          navigate('/student-dashboard/enrollments');
        }}>{tr("Enroll")}</button>
        <button type="button" className="btn btn-secondary" onClick={dismiss}>{tr("Cancel")}</button>
      </div>
    </dialog>
  );
}
