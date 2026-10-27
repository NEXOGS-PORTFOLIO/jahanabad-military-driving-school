const { escapeHtml } = require('./escapeHtml');
const { getMailTransport, deliveryError } = require('./mailTransport');
const { layout, details } = require('./emailLayout');

exports.sendEmail = async (options) => {
  try {
    const { transport, sender } = getMailTransport();
    const mailOptions = {
      from: { name: 'Jahanabad Military Driving School', address: sender },
      to: options.email,
      subject: options.subject,
      html: options.message,
      text: options.text,
      messageId: options.messageId,
      replyTo: options.replyTo
    };
    const info = await transport.sendMail(mailOptions);
    if ((Array.isArray(info.accepted) && !info.accepted.length) || (info.rejected?.length && !info.accepted?.length)) {
      const rejected = new Error('Recipient rejected');
      rejected.code = 'EMAIL_RECIPIENT_REJECTED';
      throw rejected;
    }
    console.log('Email accepted by SMTP:', info.messageId);

    return { success: true };
  } catch (error) {
    const failure = deliveryError(error);
    console.error('Email delivery failed:', { code: failure.code, smtpCode: failure.smtpCode, responseCode: failure.responseCode, command: failure.command });
    throw failure;
  }
};

exports.sendRegistrationSuccessEmail = async (email, name) => {
  const escapedName = String(name).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const body = 'আপনার রেজিস্ট্রেশন সফল হয়েছে। এখন আপনার প্রয়োজনীয় কোর্সটি এনরোল করুন।';
  return exports.sendEmail({
    email,
    subject: 'রেজিস্ট্রেশন সফল হয়েছে — Jahanabad Military Driving School',
    text: `প্রিয় ${name},\n${body}`,
    message: `<div lang="bn" style="font-family:Arial,sans-serif;max-width:600px;margin:auto;line-height:1.8"><p>প্রিয় ${escapedName},</p><p>${body}</p></div>`
  });
};

exports.sendEnrollmentConfirmationEmail = async (email, confirmation) => {
  const text = `${confirmation.greeting}\n${confirmation.message}\nContact No.: ${confirmation.contactNumber}\nAddress: ${confirmation.address}`;
  const escaped = text.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  return exports.sendEmail({
    email,
    subject: "কোর্সে এনরোলমেন্ট নিশ্চিতকরণ - Jahanabad Military Driving School",
    text,
    message: `<div lang="bn" style="font-family:Arial,sans-serif;max-width:600px;margin:auto;line-height:1.8;white-space:pre-line">${escaped}</div>`,
  });
};
   
exports.sendOTPEmail = async (email, otp, name) => {
  const message = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">Welcome to Jahanabad Military Driving School!</h2>
      <p>Hello ${name},</p>
      <p>Thank you for registering with us. Please use the following OTP to verify your account:</p>
      <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #27ae60; margin: 0; font-size: 36px;">${otp}</h1>
      </div>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you did not register, please ignore this email.</p>
      <hr style="border: 1px solid #eee; margin: 30px 0;">
      <p style="color: #7f8c8d; font-size: 12px;">
        Jahanabad Military Driving School, Khulna<br>
        Contact: ${process.env.EMAIL_USER}
      </p>
    </div>
  `;

  return await this.sendEmail({
    email,
    subject: 'Email Verification - OTP',
    message,
    type: 'otp'
  });
};

exports.sendContactEmail = async contact => exports.sendEmail({ email: 'info@jmdschool.com',
  replyTo: contact.email,
  subject: 'New Contact Form Submission | JMDS',
  text: `Name: ${contact.name}\nEmail: ${contact.email}\nPhone: ${contact.phone || 'N/A'}\n\nMessage:\n${contact.message}`,
  message: layout({ lang: 'en', title: 'New contact form submission', preheader: 'A new message has arrived through the JMDS website.',
    content: details([['Name', contact.name], ['Email', contact.email], ['Phone', contact.phone || 'N/A']]) +
      '<h2 style="font-size:17px">Message</h2>' + `<p style="white-space:pre-line;line-height:1.9">${escapeHtml(contact.message)}</p>` }) });

exports.sendPasswordResetEmail = async (email, otp, name) => {
  const message = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">Password Reset Request</h2>
      <p>Hello ${name},</p>
      <p>We received a request to reset your password. Use the OTP below to proceed:</p>
      <div style="background-color: #f4f4f4; padding: 24px; text-align: center; margin: 24px 0; border-radius: 8px;">
        <h1 style="color: #c0392b; margin: 0; font-size: 40px; letter-spacing: 10px; font-family: 'Courier New', monospace;">${otp}</h1>
      </div>
      <p>This OTP will expire in <strong>10 minutes</strong>.</p>
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0;">
        <p style="margin: 0; color: #856404;">
          <strong>⚠️ Security Notice:</strong> If you did not request a password reset, please ignore this email. Your password will remain unchanged.
        </p>
      </div>
      <hr style="border: 1px solid #eee; margin: 30px 0;">
      <p style="color: #7f8c8d; font-size: 12px;">
        Jahanabad Military Driving School, Khulna<br>
        Contact: info@jmdschool.com | Phone: 01769-564999
      </p>
    </div>
  `;

  return await this.sendEmail({
    email,
    subject: 'Password Reset OTP - Jahanabad Military Driving School',
    message
  });
};

exports.sendLoginNotificationEmail = async (email, name, loginInfo) => {
  const { loginTime, ipAddress, userAgent } = loginInfo;
  const message = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">Login Notification</h2>
      <p>Hello ${name},</p>
      <p>Your account was just accessed. Here are the login details:</p>
      <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>Login Time:</strong> ${loginTime}</p>
        <p style="margin: 8px 0;"><strong>IP Address:</strong> ${ipAddress || 'Unknown'}</p>
        <p style="margin: 8px 0;"><strong>Device/Browser:</strong> ${userAgent || 'Unknown'}</p>
      </div>
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #856404;">
          <strong>⚠️ Security Alert:</strong> If this wasn't you, please change your password immediately and contact support.
        </p>
      </div>
      <p>If this was you, you can safely ignore this email.</p>
      <hr style="border: 1px solid #eee; margin: 30px 0;">
      <p style="color: #7f8c8d; font-size: 12px;">
        Jahanabad Military Driving School, Khulna<br>
        Contact: info@jmdschool.com | Phone: 01769-564999
      </p>
    </div>
  `;

  return await this.sendEmail({
    email,
    subject: '🔐 Login Alert - Jahanabad Military Driving School',
    message,
    type: 'login_notification'
  });
};
