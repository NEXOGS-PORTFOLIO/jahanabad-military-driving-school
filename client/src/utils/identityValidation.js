import { CONTACT_LIMITS, validateContact, normalizeContact } from './contactValidation';
export const IDENTITY_LIMITS = { name: CONTACT_LIMITS.name, email: CONTACT_LIMITS.email, phone: CONTACT_LIMITS.phone };
export const validateIdentity = data => Object.fromEntries(Object.entries(validateContact(data)).filter(([name]) => name in IDENTITY_LIMITS));
export const normalizeIdentity = data => {
  const normalized = normalizeContact(data);
  return { name: normalized.name, email: normalized.email, phone: normalized.phone };
};
