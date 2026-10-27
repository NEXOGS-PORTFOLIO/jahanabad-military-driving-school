// Verifies SMTP authentication and compiles every notification without sending
// email to a real recipient. No passwords or verification codes are printed.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const nodemailer = require('nodemailer');
const email = require('../utils/emailService');
const { getMailTransport, verifyEmailConnection, closeEmailConnection } = require('../utils/mailTransport');
const confirmation = require('../utils/enrollmentConfirmation');

(async () => {
  await verifyEmailConnection();
  console.log('SMTP connection and authentication: OK');
  const sender = getMailTransport().sender;
  const mimeTransport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
  const sendEmail = email.sendEmail;
  email.sendEmail = async options => {
    if (!options.message || !options.text || !options.subject) throw new Error('Notification template is incomplete');
    const compiled = await mimeTransport.sendMail({ from: sender, to: 'diagnostic@example.invalid',
      subject: options.subject, html: options.message, text: options.text, messageId: options.messageId });
    if (!Buffer.isBuffer(compiled.message) || !compiled.message.length) throw new Error('Notification MIME compilation failed');
    return { success: true };
  };
  try {
    const templates = [
      ['Registration success', () => email.sendRegistrationSuccessEmail('diagnostic@example.invalid', 'Diagnostic Student')],
      ['Enrollment confirmation', () => email.sendEnrollmentConfirmationEmail('diagnostic@example.invalid', confirmation('Diagnostic Student', 'Driving Course'))],
      ['Email verification', () => email.sendOTPEmail('diagnostic@example.invalid', '123456', 'Diagnostic Student')],
      ['Password reset', () => email.sendPasswordResetEmail('diagnostic@example.invalid', '123456', 'Diagnostic Student')],
      ['Login notification', () => email.sendLoginNotificationEmail('diagnostic@example.invalid', 'Diagnostic Student', { loginTime: 'Diagnostic time', ipAddress: '127.0.0.1', userAgent: 'Diagnostic browser' })],
      ['Course completion', () => email.sendCourseCompletionEmail('diagnostic@example.invalid', { studentName: 'Diagnostic Student', courseName: 'Driving Course', certificateId: 'JMDS-DIAGNOSTIC', enrollmentId: 'diagnostic' })]
    ];
    for (const [name, compile] of templates) { await compile(); console.log(`${name} template: OK`); }
    console.log('All six templates passed. No email messages were sent.');
  } finally { email.sendEmail = sendEmail; }
})().catch(error => {
  console.error('Email check failed:', error.code || 'EMAIL_TEMPLATE_FAILED', error.message);
  process.exitCode = 1;
}).finally(closeEmailConnection);
