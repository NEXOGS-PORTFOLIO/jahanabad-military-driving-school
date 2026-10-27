// Bound SMS costs across registration and resends. For multiple server instances,
// also enforce a shared limit at the reverse proxy/API gateway.
const requests = new Map();
module.exports = (req, res, next) => {
  const now = Date.now();
  for (const [key, entry] of requests) {
    if (entry.expires <= now) requests.delete(key);
  }
  const key = req.ip;
  let entry = requests.get(key);
  if (!entry) {
    if (requests.size >= 10000) return res.status(429).json({ success: false, message: 'Please try again later.' });
    entry = { count: 0, expires: now + 3600000 };
    requests.set(key, entry);
  }
  if (++entry.count > 10) {
    res.set('Retry-After', String(Math.ceil((entry.expires - now) / 1000)));
    return res.status(429).json({ success: false, message: 'Too many verification requests. Please try again later.' });
  }
  next();
};
