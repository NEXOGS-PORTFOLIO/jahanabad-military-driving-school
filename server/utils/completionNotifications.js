const { randomUUID } = require('crypto');
const mongoose = require('mongoose');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const { getCertificatePDF } = require('./certificatePDF');

const claimDuration = 15 * 60 * 1000;
const referenceId = value => String(value?._id || value || '');
const pendingFilter = now => ({
  status: 'completed', progress: 100,
  completionEmailRequestedAt: { $exists: true }, completionEmailSentAt: { $exists: false },
  $and: [
    { $or: [{ completionEmailClaimExpiresAt: { $exists: false } }, { completionEmailClaimExpiresAt: { $lte: now } }] },
    { $or: [{ completionEmailNextAttemptAt: { $exists: false } }, { completionEmailNextAttemptAt: { $lte: now } }] }
  ]
});

// The persisted queue is on the enrollment, so multiple certificate records or
// concurrent completion requests cannot independently send duplicate notices.
const processCourseCompletionNotification = async enrollmentId => {
  const now = new Date(), token = randomUUID();
  let enrollment;
  try {
    enrollment = await Enrollment.findOneAndUpdate({ _id: enrollmentId, ...pendingFilter(now) }, {
      $set: { completionEmailClaimToken: token, completionEmailClaimExpiresAt: new Date(now.getTime() + claimDuration) },
      $inc: { completionEmailAttempts: 1 }
    }, { new: true }).populate('student', 'name email role').populate('course', 'title');
    if (!enrollment) return { sent: false, reason: 'not-pending' };

    const certificate = await Certificate.findOne({ enrollment: enrollment._id, status: 'valid' })
      .populate('student', 'name email fatherName gender')
      .populate('course', 'title duration')
      .populate('batch', 'startDate endDate')
      .populate('enrollment', 'status progress approvedAt enrolledAt completedAt');
    if (!certificate || !enrollment.student?.email || enrollment.student.role !== 'student' || !certificate.course?.title ||
      referenceId(certificate.student) !== referenceId(enrollment.student) ||
      referenceId(certificate.course) !== referenceId(enrollment.course) ||
      referenceId(certificate.enrollment) !== referenceId(enrollment) || certificate.enrollment.status !== 'completed' || certificate.enrollment.progress !== 100) {
      throw new Error('CERTIFICATE_NOT_READY');
    }

    // This is the same generator/cache used by the student's download endpoint.
    // It must successfully generate AND persist the PDF before the email is sent.
    const pdf = await getCertificatePDF(certificate);
    if (!Buffer.isBuffer(pdf) || !pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('CERTIFICATE_NOT_READY');
    const [certificateAvailable, completionConfirmed] = await Promise.all([
      Certificate.exists({ _id: certificate._id, status: 'valid', pdfData: { $exists: true, $ne: '' } }),
      Enrollment.exists({ _id: enrollment._id, status: 'completed', progress: 100, completionEmailClaimToken: token, completionEmailSentAt: { $exists: false } })
    ]);
    if (!certificateAvailable || !completionConfirmed) throw new Error('CERTIFICATE_NOT_READY');

    await require('./emailService').sendCourseCompletionEmail(enrollment.student.email, {
      studentName: enrollment.student.name, courseName: certificate.course.title,
      certificateId: certificate.certificateId, enrollmentId: referenceId(enrollment)
    });
    await Enrollment.updateOne({ _id: enrollment._id, completionEmailClaimToken: token }, {
      $set: { completionEmailSentAt: new Date() },
      $unset: { completionEmailClaimToken: '', completionEmailClaimExpiresAt: '', completionEmailNextAttemptAt: '' }
    });
    return { sent: true };
  } catch (error) {
    if (enrollment) {
      const delay = Math.min(6 * 60 * 60 * 1000, 5 * 60 * 1000 * 2 ** Math.max(0, (enrollment.completionEmailAttempts || 1) - 1));
      try {
        await Enrollment.updateOne({ _id: enrollment._id, completionEmailClaimToken: token }, {
          $set: { completionEmailNextAttemptAt: new Date(Date.now() + delay) },
          $unset: { completionEmailClaimToken: '', completionEmailClaimExpiresAt: '' }
        });
      } catch (_) { /* The persisted claim expires, allowing recovery after a DB outage. */ }
    }
    console.warn('Course completion email deferred:', error.message === 'CERTIFICATE_NOT_READY' ? 'certificate-not-ready' : 'delivery-or-storage-unavailable');
    return { sent: false, reason: 'deferred' };
  }
};

const startCourseCompletionEmailWorker = () => {
  let running = false;
  const run = async () => {
    if (running || mongoose.connection.readyState !== 1) return;
    running = true;
    try {
      const pending = await Enrollment.find(pendingFilter(new Date())).select('_id').sort({ completionEmailRequestedAt: 1 }).limit(20).lean();
      for (const enrollment of pending) await processCourseCompletionNotification(enrollment._id);
    } catch (_) {
      console.warn('Course completion email queue will retry when the database is available.');
    } finally { running = false; }
  };
  const timer = setInterval(run, 60 * 1000);
  timer.unref();
  return () => clearInterval(timer);
};

module.exports = { processCourseCompletionNotification, startCourseCompletionEmailWorker };
