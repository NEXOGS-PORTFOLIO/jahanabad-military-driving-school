const jwt = require('jsonwebtoken');
const { createHmac, randomBytes } = require('node:crypto');
const digest = (answer, nonce) => createHmac('sha256', process.env.JWT_SECRET)
  .update(`${nonce}:${answer}`).digest('hex');

exports.createChallenge = answer => {
  const nonce = randomBytes(16).toString('hex');
  return jwt.sign({ nonce, digest: digest(answer, nonce) }, process.env.JWT_SECRET,
    { audience: 'certificate-captcha', expiresIn: '5m', algorithm: 'HS256' });
};

exports.verifyChallenge = (answer, token) => {
  if (typeof answer !== 'string' || typeof token !== 'string') return false;
  if (answer.length !== 6) return false;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET,
      { audience: 'certificate-captcha', algorithms: ['HS256'] });
    return payload.digest === digest(answer, payload.nonce);
  } catch {
    return false;
  }
};
