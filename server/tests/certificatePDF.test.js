const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateCertificatePDF, certificateRelation } = require('../utils/pdfGenerator');
const { getCertificatePDF } = require('../utils/certificatePDF');

test('certificate relationship follows saved gender without guessing for legacy students', () => {
  assert.equal(certificateRelation('male'), 'Son of');
  assert.equal(certificateRelation(' Female '), 'Daughter of');
  assert.equal(certificateRelation(undefined), 'Child of');
});

test('reference certificate generates one landscape page for both genders and long values', async () => {
  for (const studentGender of ['male', 'female', '']) {
    const buffer = await generateCertificatePDF({
      certificateId: 'JMDS-2026-00000405', studentName: 'A student with a very long full name '.repeat(3),
      fatherName: 'A father with a very long full name '.repeat(3), studentGender,
      courseName: 'Professional Driving Course '.repeat(4),
      startDate: '2026-07-01', endDate: '2026-09-30', issuedDate: '2026-10-13'
    });
    const pdf = buffer.toString('latin1');
    assert.ok(pdf.startsWith('%PDF-'));
    assert.match(pdf, /\/BaseFont \/[A-Z]+\+OldEnglishTextMT\b/);
    assert.match(pdf, /\/BaseFont \/[A-Z]+\+MonotypeCorsiva\b/);
    assert.match(pdf, /\/BaseFont \/[A-Z]+\+Georgia\b/);
    assert.doesNotMatch(pdf, /\/BaseFont \/[A-Z]+\+Georgia[-,]Bold\b/);
    assert.match(pdf, /\/BaseFont \/[A-Z]+\+Lobster-Regular\b/);
    assert.doesNotMatch(pdf, /Georgia-BoldItalic|Ariston/);
    assert.match(pdf, /\/FontFile2 /);
    assert.doesNotMatch(pdf, /MonotypeCorsiva[-,]Bold/);
    assert.equal((pdf.match(/\/Type \/Page\b/g) || []).length, 1);
    assert.match(pdf, /\/MediaBox \[0 0 841\.89 595\.28\]/);
    assert.match(pdf, /\/Subtype \/Link/);
    assert.ok(pdf.includes('certificate-verify?certificateId=JMDS-2026-00000405'));
  }
});

test('old PDFs refresh, matching PDFs are reused, and gender changes invalidate the cache', async () => {
  let saves = 0;
  const certificate = {
    certificateId: 'JMDS-CACHE-001', student: { name: 'Test Student', fatherName: 'Test Father', gender: 'male' },
    course: { title: 'Driving Course' }, batch: { startDate: '2026-07-01', endDate: '2026-09-30' },
    issuedDate: '2026-10-13', pdfData: Buffer.from('old design').toString('base64'),
    async save() { saves++; }
  };
  const first = await getCertificatePDF(certificate);
  const fingerprint = certificate.pdfFingerprint;
  assert.equal(saves, 1);
  assert.ok(first.toString('latin1').startsWith('%PDF-'));
  assert.deepEqual(await getCertificatePDF(certificate), first);
  assert.equal(saves, 1);
  certificate.student.gender = 'female';
  const updated = await getCertificatePDF(certificate);
  assert.equal(saves, 2);
  assert.notEqual(certificate.pdfFingerprint, fingerprint);
  assert.notDeepEqual(updated, first);
});
