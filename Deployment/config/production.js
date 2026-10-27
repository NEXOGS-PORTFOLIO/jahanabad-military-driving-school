const validateProductionEnv = () => {
  const required = ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'CLOUDINARY_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing = required.filter(key => !process.env[key]?.trim());
  if (missing.length) throw new Error(`Missing production settings: ${missing.join(', ')}`);
  if (process.env.JWT_SECRET.length < 32 || /replace|example|changeme/i.test(process.env.JWT_SECRET)) {
    throw new Error('JWT_SECRET must be a strong random secret of at least 32 characters');
  }
  require('./database').databaseUri();
  const emailPort = Number(process.env.EMAIL_PORT);
  if (!Number.isInteger(emailPort) || emailPort < 1 || emailPort > 65535) {
    throw new Error('EMAIL_PORT must be a valid TCP port');
  }
  for (const origin of process.env.CLIENT_URL.split(',')) {
    const url = new URL(origin.trim());
    if (!['https:', 'http:'].includes(url.protocol) || ![url.origin, `${url.origin}/`].includes(origin.trim())) {
      throw new Error('CLIENT_URL must contain HTTP or HTTPS origins without paths, credentials, queries or fragments');
    }
  }
};
module.exports = { validateProductionEnv };
