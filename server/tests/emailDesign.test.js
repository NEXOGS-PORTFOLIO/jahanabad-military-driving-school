const { test } = require('node:test');
const assert = require('node:assert/strict');
const mails = [];
const nodemailer = require('nodemailer');
nodemailer.createTransport = () => ({ verify() {}, async sendMail(mail) { mails.push(mail); return { messageId: 'test-message' }; } });
process.env.CLIENT_URL = 'https://school.example';
process.env.EMAIL_USER = 'info@school.example';
process.env.EMAIL_HOST = 'mail.school.example';
process.env.EMAIL_PORT = '465';
process.env.EMAIL_PASS = 'test-only-password';
const email = require('../utils/emailService');
const enrollmentConfirmation = require('../utils/enrollmentConfirmation');

test('student notifications use consistent branded HTML, Bangla copy, and plain-text alternatives', async () => {
  await email.sendRegistrationSuccessEmail('student@example.com', '<Student>');
  await email.sendEnrollmentConfirmationEmail('student@example.com', enrollmentConfirmation('<Student>', 'Driving & Safety'));
  await email.sendOTPEmail('student@example.com', '012345', '<Student>');
  await email.sendCourseCompletionEmail('student@example.com', { studentName: '<Student>', courseName: 'Driving & Safety', certificateId: 'JMDS-001', enrollmentId: 'test-id' });
  await email.sendPasswordResetEmail('student@example.com', '987654', '<Student>');
  await email.sendLoginNotificationEmail('student@example.com', '<Student>', { loginTime: '2026-10-13', ipAddress: '127.0.0.1', userAgent: '<script>device</script>' });
  assert.equal(mails.length, 6);
  for (const mail of mails) {
    assert.equal(mail.to, 'student@example.com');
    assert.match(mail.subject, /[\u0980-\u09ff]/);
    assert.match(mail.html, /<html lang="bn">/);
    assert.ok(mail.html.includes('bgcolor="#203f2b"'));
    assert.ok(mail.html.includes('max-width:620px'));
    assert.ok(mail.html.includes('JAHANABAD MILITARY DRIVING SCHOOL'));
    assert.ok(mail.html.includes('01769-564999'));
    assert.ok(mail.html.includes('&lt;Student&gt;'));
    assert.ok(!mail.html.includes('<Student>'));
    assert.match(mail.text, /[\u0980-\u09ff]/);
  }
  assert.ok(mails[0].html.includes('https://school.example/courses'));
  assert.ok(mails[1].html.includes('https://school.example/student-dashboard/enrollments'));
  assert.ok(mails[2].html.includes('012345'));
  assert.ok(mails[2].text.includes('১০ মিনিট'));
  assert.ok(mails[3].subject.startsWith('কোর্স সম্পন্ন হয়েছে — আপনার সনদ প্রস্তুত | '));
  assert.ok(mails[3].html.includes('https://school.example/student-dashboard/certificates'));
  assert.ok(mails[3].text.includes('JMDS-001'));
  assert.ok(!mails[5].html.includes('<script>'));
});
