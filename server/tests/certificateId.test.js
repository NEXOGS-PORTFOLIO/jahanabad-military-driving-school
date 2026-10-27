const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { allocateCertificateId, Counter } = require('../utils/certificateId');
const Certificate = require('../models/Certificate');
const originals = [Counter.updateOne, Counter.findOneAndUpdate];
const originalStart = process.env.CERTIFICATE_SERIAL_START;
afterEach(() => {
  [Counter.updateOne, Counter.findOneAndUpdate] = originals;
  if (originalStart === undefined) delete process.env.CERTIFICATE_SERIAL_START;
  else process.env.CERTIFICATE_SERIAL_START = originalStart;
});

function database(latest = null) {
  const counters = new Map();
  const model = {
    collection: { async createIndex(keys, options) { assert.equal(options.unique, true); } },
    async aggregate(pipeline) {
      assert.match('JMDS-2026-00000404', pipeline[0].$match.certificateId);
      assert.match('JMDS-2028-000404', pipeline[0].$match.certificateId);
      assert.deepEqual(pipeline[1].$group.serial, { $max: { $toInt: { $substrBytes: ['$certificateId', 10, 8] } } });
      return latest ? [{ serial: Number(latest.certificateId.slice(10)) }] : [];
    }
  };
  Counter.updateOne = async (filter, update) => {
    counters.set(filter._id, Math.max(counters.get(filter._id) || 0, update.$max.serial));
  };
  Counter.findOneAndUpdate = async (filter, update) => {
    const serial = counters.get(filter._id);
    if (serial >= filter.serial.$lt) return null;
    counters.set(filter._id, serial + update.$inc.serial);
    return { serial: counters.get(filter._id) };
  };
  return model;
}

test('simultaneous allocations return distinct sequential IDs padded to six digits', async () => {
  const model = database();
  const ids = await Promise.all(Array.from({ length: 100 }, () => allocateCertificateId(model, new Date('2026-06-01'))));
  assert.equal(new Set(ids).size, 100);
  assert.equal(ids.sort()[0], 'JMDS-2026-000404');
  assert.equal(ids.at(-1), 'JMDS-2026-000503');
});

test('year rollover uses Dhaka midnight and continues the global sequence', async () => {
  const model = database();
  assert.equal(await allocateCertificateId(model, new Date('2026-12-31T17:59:59Z')), 'JMDS-2026-000404');
  assert.equal(await allocateCertificateId(model, new Date('2026-12-31T18:00:00Z')), 'JMDS-2027-000405');
});

test('existing formatted certificates seed the sequence without modifying records', async () => {
  assert.equal(await allocateCertificateId(database({ certificateId: 'JMDS-2026-00000407' }), new Date('2027-06-01')), 'JMDS-2027-000408');
  assert.equal(await allocateCertificateId(database({ certificateId: 'JMDS-2025-00000999' }), new Date('2028-06-01')), 'JMDS-2028-001000');
});

test('configuration and serial exhaustion are enforced', async () => {
  process.env.CERTIFICATE_SERIAL_START = '500';
  assert.equal(await allocateCertificateId(database(), new Date('2026-06-01')), 'JMDS-2026-000500');
  await assert.rejects(allocateCertificateId(database({ certificateId: 'JMDS-2026-99999999' }), new Date('2026-06-01')), /exhausted/);
  process.env.CERTIFICATE_SERIAL_START = 'invalid';
  await assert.rejects(allocateCertificateId(database()), /CERTIFICATE_SERIAL_START/);
});

test('existing legacy certificates retain their ID during validation', async () => {
  const certificate = new Certificate({ certificateId: 'JMDS-LEGACY-ABC', student: '507f1f77bcf86cd799439011', course: '507f1f77bcf86cd799439012', enrollment: '507f1f77bcf86cd799439013' });
  await certificate.validate();
  assert.equal(certificate.certificateId, 'JMDS-LEGACY-ABC');
  assert.equal(Certificate.schema.path('certificateId').options.unique, true);
});
