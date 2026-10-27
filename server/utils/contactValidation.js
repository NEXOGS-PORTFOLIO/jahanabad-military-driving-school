// Keep browser and server rules identical; the contract test checks both copies.
const CONTACT_LIMITS = { name: { min: 3, max: 100 }, email: { max: 254 }, phone: { max: 25 }, message: {} };
const fields = Object.keys(CONTACT_LIMITS);
const invalidControls = value => Array.from(value).some(character => {
  const code = character.charCodeAt(0);
  return (code < 32 && ![9, 10, 13].includes(code)) || code === 127;
});

function normalizeContact(input) {
  const data = {};
  for (const field of fields) data[field] = typeof input?.[field] === 'string' ? input[field].trim() : '';
  data.email = data.email.toLowerCase();
  const phone = data.phone.replace(/[\s-]/g, '').replace(/[\u09E6-\u09EF]/g, digit => String(digit.charCodeAt(0) - 0x09E6));
  data.phone = phone ? (phone.startsWith('+') ? phone : phone.startsWith('880') ? `+${phone}` : `+88${phone}`) : '';
  return data;
}

function validateContact(input) {
  const errors = {};
  for (const field of fields) {
    const raw = input?.[field];
    if (raw !== undefined && typeof raw !== 'string') {
      errors[field] = 'Please enter text in this field.';
      continue;
    }
    const value = (raw || '').trim();
    const limit = CONTACT_LIMITS[field];
    if (!value) {
      errors[field] = { name: 'Please enter your name.', email: 'Please enter your email address.', phone: 'Please enter your mobile number.', message: 'Please enter your message.' }[field];
    } else if ((raw || '').length > limit.max) {
      errors[field] = `Please use no more than ${limit.max} characters.`;
    } else if (value && limit.min && value.length < limit.min) {
      errors[field] = `Please enter at least ${limit.min} characters.`;
    } else if (field !== 'message' && invalidControls(value)) {
      errors[field] = 'Please remove unsupported control characters.';
    } else if (field === 'name' && value && (!/^[\p{L}\p{M} .\u2019'-]+$/u.test(value) || !/\p{L}/u.test(value))) {
      errors[field] = 'Use letters, spaces, apostrophes, periods or hyphens for your name.';
    } else if (field === 'email' && value) {
      const parts = value.split('@');
      const local = parts[0];
      const domain = parts[1] || '';
      if (parts.length !== 2 || local.length > 64 || !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..') || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(domain)) {
        errors[field] = 'Enter a valid email address, such as name@example.com.';
      }
    } else if (field === 'phone' && value) {
      const phone = value.replace(/[\s-]/g, '').replace(/[\u09E6-\u09EF]/g, digit => String(digit.charCodeAt(0) - 0x09E6));
      if (!/^(\+8801|8801|01)[3-9]\d{8}$/.test(phone)) errors[field] = 'Enter a Bangladesh mobile number with 11 digits';
    }
  }
  return errors;
}

module.exports = { CONTACT_LIMITS, normalizeContact, validateContact };
