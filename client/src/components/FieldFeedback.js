import React from 'react';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { translate as tr } from '../hooks/useSiteTranslation';
import './FormValidation.css';

export default function FieldFeedback({ prefix, name, touched, error }) {
  if (!touched) return null;
  return (
    <div id={`${prefix}-${name}-feedback`} aria-live="polite">
      <p id={error ? `${prefix}-${name}-error` : undefined} className={error ? 'field-error' : 'field-success'}>
        {error ? <FaTimesCircle aria-hidden="true" /> : <FaCheckCircle aria-hidden="true" />}
        {tr(error || 'Looks good.')}
      </p>
    </div>
  );
}
