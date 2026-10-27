// Local package smoke check. Database and email are mocked; no real credentials
// or database writes are used. Host integration must be checked after upload.
const path = require('path');
const fs = require('fs');
const assert = require('node:assert/strict');
const Module = require('module');
const http = require('http');
const output = path.resolve(__dirname, '../Deployment');
process.env.NODE_PATH = path.resolve(__dirname, '../server/node_modules');
Module._initPaths();
Object.assign(process.env, {
  NODE_ENV: 'production', PORT: '0', MONGODB_URI: 'mongodb://127.0.0.1/smoke-test',
  JWT_SECRET: 'a'.repeat(64), JWT_EXPIRE: '1d', CLIENT_URL: 'https://jmdschool.com/, http://jmdschool.com/',
  EMAIL_HOST: 'smtp.school.test', EMAIL_PORT: '465', EMAIL_USER: 'test@school.test',
  EMAIL_PASS: 'test-only', CLOUDINARY_NAME: 'test', CLOUDINARY_API_KEY: 'test',
  CLOUDINARY_API_SECRET: 'test'
});
const originalLoad = Module._load;
Module._load = function (request, parent, ...rest) {
  const resolved = Module._resolveFilename(request, parent);
  if (resolved === path.join(output, 'config/db.js')) return () => {};
  if (resolved === path.join(output, 'utils/emailService.js')) return {};
  return originalLoad.call(this, request, parent, ...rest);
};
let server;
const originalListen = http.Server.prototype.listen;
http.Server.prototype.listen = function (...args) {
  server = this;
  return originalListen.apply(this, args);
};
require(path.join(output, 'app.js'));
Module._load = originalLoad;
http.Server.prototype.listen = originalListen;

(async () => {
  try {
    if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const mongoose = require('mongoose');
    const unavailable = await fetch(`${base}/api/health`);
    assert.equal(unavailable.status, 503);
    assert.equal((await unavailable.json()).database, 'disconnected');
    mongoose.connection.readyState = 1;
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).database, 'connected');
    for (const origin of ['https://jmdschool.com', 'http://jmdschool.com']) {
      const cors = await fetch(`${base}/api/health`, { headers: { Origin: origin } });
      assert.equal(cors.status, 200);
      assert.equal(cors.headers.get('access-control-allow-origin'), origin);
      const preflight = await fetch(`${base}/api/auth/login`, {
        method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' }
      });
      assert.equal(preflight.status, 204);
      assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    }
    const rejected = await fetch(`${base}/api/health`, { headers: { Origin: 'https://untrusted.test' } });
    assert.equal(rejected.headers.get('access-control-allow-origin'), null);
    const index = fs.readFileSync(path.join(output, 'public/index.html'), 'utf8');
    for (const route of ['/', '/login', '/student-dashboard/enrollments', '/admin-dashboard/students', '/instructor-dashboard/students']) {
      const response = await fetch(`${base}${route}`);
      assert.equal(response.status, 200, route);
      assert.equal(await response.text(), index, route);
    }
    const missing = await fetch(`${base}/api/not-a-route`);
    assert.equal(missing.status, 404);
    assert.match(missing.headers.get('content-type'), /json/);
    const invalidLogin = await fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: { $ne: null }, password: 'test' })
    });
    assert.equal(invalidLogin.status, 400);
    const privateProfile = await fetch(`${base}/api/users/507f1f77bcf86cd799439011`);
    assert.equal(privateProfile.status, 401);
    assert.equal((await privateProfile.json()).code, 'AUTH_REQUIRED');
    const challenge = await (await fetch(`${base}/api/certificates/captcha`)).json();
    assert.equal(typeof challenge.data.captchaToken, 'string');
    const forgedCaptcha = await fetch(`${base}/api/certificates/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ certificateId: 'test', captcha: '123456', sessionCaptcha: '123456' })
    });
    assert.equal(forgedCaptcha.status, 400);
    for (const route of ['/.env', '/package.json', '/server.js']) {
      const response = await fetch(`${base}${route}`);
      assert.equal(await response.text(), index, `Private path exposed: ${route}`);
    }
    const asset = index.match(/src="(\/static\/js\/[^\"]+)"/)[1];
    const response = await fetch(`${base}${asset}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /javascript/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    console.log('Production package smoke check passed: frontend routes, static assets, domain CORS/preflight, JSON API 404, health states, and private file protection. Database/email mocked.');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
