const { test } = require('node:test');
const assert = require('node:assert/strict');
const limit = require('../middleware/registrationRateLimit');

test('registration and resend requests are bounded per client IP', () => {
  let allowed = 0;
  const res = {
    set(name, value) { this.retryAfter = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; }
  };
  for (let i = 0; i < 11; i++) limit({ ip: '192.0.2.1' }, res, () => allowed++);
  assert.equal(allowed, 10);
  assert.equal(res.statusCode, 429);
  assert.ok(Number(res.retryAfter) > 0);
  limit({ ip: '192.0.2.2' }, res, () => allowed++);
  assert.equal(allowed, 11);
});
