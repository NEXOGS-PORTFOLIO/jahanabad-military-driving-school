const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const databaseReady = require('../middleware/databaseReady');

test('database outages return 503 immediately and recovery allows requests', () => {
  const original = mongoose.connection.readyState;
  try {
    for (const state of [0, 2, 3]) {
      mongoose.connection.readyState = state;
      const res = {
        status(code) { this.code = code; return this; },
        json(body) { this.body = body; }
      };
      databaseReady({}, res, () => assert.fail('Must not query an unavailable database'));
      assert.equal(res.code, 503);
      assert.equal(res.body.code, 'DATABASE_UNAVAILABLE');
    }
    mongoose.connection.readyState = 1;
    let called = false;
    databaseReady({}, {}, () => { called = true; });
    assert.equal(called, true);
  } finally {
    mongoose.connection.readyState = original;
  }
});
