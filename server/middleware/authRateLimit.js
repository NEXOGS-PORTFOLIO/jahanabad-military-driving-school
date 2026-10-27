// Apply a bounded per-process limit to password guessing and recovery requests.
// Multi-process hosts should enforce a shared limit at their gateway as well.
const requests = new Map();
module.exports = (req, res, next) => {
  const now = Date.now();
  for (const [key, entry] of requests) if (entry.expires <= now) requests.delete(key);
  const key = req.ip;
  let entry = requests.get(key);
  if (!entry) {
    if (requests.size >= 10000) return res.status(429).json({ success: false, message: 'Please try again later.' });
    entry = { count: 0, expires: now + 15 * 60 * 1000 };
    requests.set(key, entry);
  }
  if (++entry.count > 30) {
    res.set('Retry-After', String(Math.ceil((entry.expires - now) / 1000)));
    return res.status(429).json({ success: false, message: 'Too many authentication attempts. Please try again later.' });
  }
  next();
};
