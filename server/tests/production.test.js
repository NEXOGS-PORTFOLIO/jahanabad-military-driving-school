const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateProductionEnv } = require('../config/production');

test('production requires credentials, a valid database URI, HTTP(S) origins, and an SMTP port', () => {
  const saved = { ...process.env };
  try {
    const valid = {
      MONGODB_URI: 'mongodb://127.0.0.1/test', JWT_SECRET: 'a'.repeat(64),
      CLIENT_URL: 'https://school.test', EMAIL_HOST: 'smtp.school.test', EMAIL_PORT: '465',
      EMAIL_USER: 'test@school.test', EMAIL_PASS: 'test-password',
      CLOUDINARY_NAME: 'test', CLOUDINARY_API_KEY: 'test', CLOUDINARY_API_SECRET: 'test'
    };
    Object.assign(process.env, valid);
    assert.doesNotThrow(validateProductionEnv);
    process.env.CLIENT_URL = 'https://jmdschool.com/, http://jmdschool.com/';
    assert.doesNotThrow(validateProductionEnv);
    for (const [key, value, expected] of [
      ['JWT_SECRET', 'short', /JWT_SECRET/],
      ['MONGODB_URI', 'https://school.test', /DB_CONFIG_INVALID/],
      ['CLIENT_URL', 'ftp://school.test', /HTTP/],
      ['CLIENT_URL', 'https://school.test/path', /HTTP/],
      ['CLIENT_URL', 'https://school.test?query=1', /HTTP/],
      ['CLIENT_URL', 'https://user:pass@school.test', /HTTP/],
      ['EMAIL_PORT', 'not-a-port', /EMAIL_PORT/],
      ['EMAIL_PORT', '65536', /EMAIL_PORT/],
      ['EMAIL_PASS', '', /Missing production/]
    ]) {
      Object.assign(process.env, valid, { [key]: value });
      assert.throws(validateProductionEnv, expected);
    }
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});
