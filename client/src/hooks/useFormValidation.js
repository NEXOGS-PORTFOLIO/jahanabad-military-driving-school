import { useState } from 'react';

// Both public forms share when errors appear and how corrections clear them.
export default function useFormValidation(data, validate, prefix, loading, limits) {
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const errors = { ...validate(data), ...serverErrors };
  const touch = name => {
    if (!limits[name]) return;
    setTouched(previous => ({ ...previous, [name]: true }));
    setServerErrors(previous => { const next = { ...previous }; delete next[name]; return next; });
  };
  const fieldProps = name => ({
    id: `${prefix}-${name}`,
    name,
    value: data[name],
    onBlur: () => touch(name),
    className: `form-control${touched[name] ? errors[name] ? ' field-invalid' : ' field-valid' : ''}`,
    'aria-invalid': Boolean(touched[name] && errors[name]),
    'aria-describedby': `${prefix}-${name}-hint${touched[name] ? ` ${prefix}-${name}-${errors[name] ? 'error' : 'feedback'}` : ''}`,
    disabled: loading,
    required: true,
    minLength: limits[name].min,
    maxLength: limits[name].max
  });
  const revealErrors = () => {
    setTouched(Object.fromEntries(Object.keys(limits).map(name => [name, true])));
    setServerErrors({});
    const nextErrors = validate(data);
    const first = Object.keys(nextErrors)[0];
    if (first) document.getElementById(`${prefix}-${first}`)?.focus();
    return nextErrors;
  };
  const resetValidation = () => { setTouched({}); setServerErrors({}); };
  return { errors, touched, touch, fieldProps, revealErrors, resetValidation, setServerErrors };
}
