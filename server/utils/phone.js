exports.normalizePhone = value => {
  if (typeof value !== 'string') return null;
  const phone = value.replace(/[\s-]/g, '');
  if (!/^(\+8801|8801|01)[3-9]\d{8}$/.test(phone)) return null;
  return phone.startsWith('+') ? phone : phone.startsWith('880') ? `+${phone}` : `+88${phone}`;
};
