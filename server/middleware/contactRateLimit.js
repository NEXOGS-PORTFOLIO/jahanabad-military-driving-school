// Bounded per-process protection; multi-process deployments also need a gateway limit.
const requests = new Map();
module.exports = (req, res, next) => {
  const now = Date.now();
  for (const [key, entry] of requests) if (entry.expires <= now) requests.delete(key);
  let entry = requests.get(req.ip);
  if (!entry) {
    if (requests.size >= 10000) {
      res.set('Retry-After', '900');
      return res.status(429).json({ success: false, message: 'Please try again in 15 minutes.' });
    }
    entry = { count: 0, expires: now + 15 * 60 * 1000 };
    requests.set(req.ip, entry);
  }
  if (++entry.count > 5) {
    res.set('Retry-After', String(Math.ceil((entry.expires - now) / 1000)));
    return res.status(429).json({ success: false, message: 'Too many messages. Please try again in 15 minutes.' });
  }
  next();
};
