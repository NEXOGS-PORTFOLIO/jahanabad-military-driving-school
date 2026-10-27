const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Certificate = require('../models/Certificate');
const controller = require('../controllers/certificateController');
const originals = [Certificate.find, Certificate.findById];
afterEach(() => { [Certificate.find, Certificate.findById] = originals; });
const response = () => ({
  headers: {}, status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; },
  setHeader(key, value) { this.headers[key] = value; },
  send(body) { this.body = body; }
});

test('admin list returns populated course, issuedDate, ID and persisted status', async () => {
  const records = [{ certificateId: 'JMDS-2026-00000404', course: { title: 'Light Vehicle' }, issuedDate: new Date('2026-10-16'), status: 'valid' }];
  const populated = [];
  Certificate.find = () => ({
    populate(path, fields) { populated.push([path, fields]); return this; },
    async sort() { return records; }
  });
  const res = response();
  await controller.getAllCertificates({ query: {} }, res);
  assert.equal(res.code, 200);
  assert.ok(populated.some(([path, fields]) => path === 'course' && fields.includes('title')));
  assert.equal(res.body.data, records);
});

test('admin preview and download use the same stored certificate and PDF, including legacy IDs', async () => {
  for (const certificateId of ['JMDS-2026-00000404', 'JMDS-LEGACY-ABC']) {
    const certificate = {
      _id: 'record-id', certificateId, student: { name: 'Test Student', gender: 'female', fatherName: 'Test Father' },
      course: { title: 'Light Vehicle' }, issuedDate: new Date('2026-10-16'), status: 'valid',
      async save() {}
    };
    Certificate.findById = id => {
      assert.equal(id, certificate._id);
      return { populate() { return this; }, then(resolve) { return Promise.resolve(certificate).then(resolve); } };
    };
    const req = { params: { id: certificate._id }, user: { role: 'admin' } };
    const preview = response();
    await controller.previewCertificate(req, preview);
    assert.equal(preview.code, 200);
    assert.equal(preview.body.data.certificateId, certificateId);
    const pdf = Buffer.from(preview.body.data.pdfData.split(',')[1], 'base64');
    assert.ok(pdf.toString('latin1').includes(`certificate-verify?certificateId=${certificateId}`));
    const download = response();
    await controller.downloadCertificate(req, download);
    assert.equal(download.headers['Content-Type'], 'application/pdf');
    assert.equal(download.headers['Content-Disposition'], `attachment; filename=Certificate-${certificateId}.pdf`);
    assert.deepEqual(download.body, pdf);
    certificate.status = 'revoked';
    const revoked = response();
    await controller.downloadCertificate(req, revoked);
    assert.equal(revoked.code, 400);
  }
});
