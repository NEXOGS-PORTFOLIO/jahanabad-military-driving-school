const { test } = require('node:test');
const assert = require('node:assert/strict');
const { databaseUri, databaseError } = require('../config/database');

test('database configuration accepts complete URIs and rejects missing values or placeholders', () => {
  const saved = process.env.MONGODB_URI;
  try {
    delete process.env.MONGODB_URI;
    assert.throws(databaseUri, /DB_CONFIG_MISSING/);
    for (const value of ['https://cluster.test', 'mongodb+srv://user:<password>@cluster.test/db', 'mongodb://bad host/db']) {
      process.env.MONGODB_URI = value;
      assert.throws(databaseUri, /DB_CONFIG_INVALID/);
    }
    process.env.MONGODB_URI = '  mongodb+srv://user:encoded%40password@cluster.test/jmds_tms  ';
    assert.equal(databaseUri(), process.env.MONGODB_URI.trim());
  } finally {
    if (saved === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = saved;
  }
});

test('database errors produce actionable diagnostics without exposing credentials', () => {
  for (const [error, code] of [
    [new Error('DB_CONFIG_MISSING'), 'DB_CONFIG_MISSING'],
    [new Error('DB_CONFIG_INVALID'), 'DB_CONFIG_INVALID'],
    [new Error('bad auth : authentication failed'), 'DB_AUTH_FAILED'],
    [new Error('querySrv ENOTFOUND'), 'DB_DNS_FAILED'],
    [new Error('certificate has expired'), 'DB_TLS_FAILED'],
    [new Error('connect ECONNREFUSED'), 'DB_CONNECTION_FAILED'],
    [{ message: 'Server selection failed', reason: { servers: new Map([['host', { error: new Error('querySrv ENOTFOUND') }]]) } }, 'DB_DNS_FAILED']
  ]) {
    error.message += ' mongodb+srv://private-user:private-password@cluster.test/db';
    const diagnostic = databaseError(error);
    assert.equal(diagnostic.code, code);
    assert(!JSON.stringify(diagnostic).includes('private-password'));
    assert(!JSON.stringify(diagnostic).includes('private-user'));
  }
});
