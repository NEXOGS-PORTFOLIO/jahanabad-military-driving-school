module.exports = (req, res, next) => {
  // Controllers must never disclose database/provider diagnostics to the browser.
  const json = res.json;
  res.json = function (body) {
    if (process.env.NODE_ENV === 'production' && this.statusCode >= 500 && body && typeof body === 'object') {
      body = { ...body, message: 'Server Error' };
    }
    return json.call(this, body);
  };
  // Prevent query operators and structured values in scalar lookup fields.
  const scalarFields = ['email', 'password', 'otp', 'certificateId', 'role', 'status', 'search', 'student', 'course', 'batch'];
  for (const input of [req.query, req.body]) {
    if (!input || typeof input !== 'object') continue;
    for (const field of scalarFields) {
      if (input[field] !== undefined && input[field] !== null && typeof input[field] !== 'string') {
        return res.status(400).json({ success: false, message: `Invalid ${field}` });
      }
    }
  }
  next();
};
