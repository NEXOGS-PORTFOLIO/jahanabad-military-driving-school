const { createHash } = require('crypto');
const { generateCertificatePDF, CERTIFICATE_DESIGN_VERSION, certificateFontFingerprint } = require('./pdfGenerator');

// Cache by the design and current student details, including gender. This also
// invalidates PDFs generated before the reference design was introduced.
exports.getCertificatePDF = async certificate => {
  const data = {
    certificateId: certificate.certificateId,
    studentName: certificate.student.name,
    fatherName: certificate.student.fatherName,
    studentGender: certificate.student.gender,
    courseName: certificate.course.title,
    startDate: certificate.batch?.startDate || certificate.enrollment?.approvedAt || certificate.enrollment?.enrolledAt,
    endDate: certificate.batch?.endDate || certificate.enrollment?.completedAt,
    issuedDate: certificate.issuedDate
  };
  const fingerprint = createHash('sha256').update(JSON.stringify({
    version: CERTIFICATE_DESIGN_VERSION, fonts: certificateFontFingerprint(), siteUrl: process.env.CLIENT_URL, data
  })).digest('hex');
  if (certificate.pdfData && certificate.pdfFingerprint === fingerprint) {
    return Buffer.from(certificate.pdfData, 'base64');
  }
  const buffer = await generateCertificatePDF(data);
  certificate.pdfData = buffer.toString('base64');
  certificate.pdfFingerprint = fingerprint;
  await certificate.save();
  return buffer;
};
