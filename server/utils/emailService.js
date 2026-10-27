const { escapeHtml } = require('./escapeHtml');
const { getMailTransport, deliveryError } = require('./mailTransport');

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

const { layout, paragraph, details, button, otpBox, portalUrl } = require('./emailLayout');

exports.sendRegistrationSuccessEmail = async (email, name) => {
  const title = 'রেজিস্ট্রেশন সফল হয়েছে';
  const greeting = `প্রিয় ${name},`;
  const body = 'আপনার রেজিস্ট্রেশন সফল হয়েছে। এখন আপনার প্রয়োজনীয় কোর্সটি এনরোল করুন।';
  const url = portalUrl('/courses');
  return exports.sendEmail({ email, subject: `${title} — Jahanabad Military Driving School`,
    text: `${greeting}\n\n${body}\n\nকোর্স দেখুন: ${url}\n\nJahanabad Military Driving School`,
    message: layout({ title, preheader: 'আপনার অ্যাকাউন্ট প্রস্তুত। পছন্দের কোর্সে এনরোল করুন।',
      content: paragraph(greeting) + paragraph(body) + button('কোর্স দেখুন ও এনরোল করুন', url) + paragraph('শৃঙ্খলাপূর্ণ প্রশিক্ষণের মাধ্যমে দক্ষ ও নিরাপদ চালক হওয়ার যাত্রায় আপনাকে স্বাগতম।') }) });
};

exports.sendCourseCompletionEmail = async (email, data) => exports.sendEmail({ email, ...require('./courseCompletionEmail')(data) });

exports.sendEnrollmentConfirmationEmail = async (email, confirmation) => {
  const title = 'কোর্সে এনরোলমেন্ট নিশ্চিতকরণ';
  const url = portalUrl('/student-dashboard/enrollments');
  return exports.sendEmail({ email, subject: `${title} — Jahanabad Military Driving School`,
    text: `${confirmation.greeting}\n\n${confirmation.message}\n\nকোর্স: ${confirmation.courseName}\nযোগাযোগ: ${confirmation.contactNumber}\nঠিকানা: ${confirmation.address}\n\nএনরোলমেন্ট দেখুন: ${url}`,
    message: layout({ title, preheader: `${confirmation.courseName} কোর্সে আপনার আবেদন গ্রহণ করা হয়েছে।`, content:
      paragraph(confirmation.greeting) + paragraph(confirmation.message) +
      details([['কোর্স', confirmation.courseName], ['যোগাযোগ', confirmation.contactNumber], ['ঠিকানা', confirmation.address]]) +
      button('আপনার এনরোলমেন্ট দেখুন', url) }) });
};

exports.sendOTPEmail = async (email, otp, name) => {
  const title = 'আপনার ইমেইল যাচাই করুন';
  const greeting = `প্রিয় ${name},`;
  const body = 'জাহানাবাদ মিলিটারি ড্রাইভিং স্কুলে আপনাকে স্বাগতম। আপনার অ্যাকাউন্ট যাচাই করতে নিচের OTP কোডটি ব্যবহার করুন।';
  return exports.sendEmail({
    email,
    subject:
      "ইমেইল যাচাইকরণ — আপনার OTP কোড | Jahanabad Military Driving School",
    text: `${greeting}\n\n${body}\n\nOTP: ${otp}\n\nএই কোডটি ১০ মিনিটের জন্য কার্যকর থাকবে। কোডটি কারও সঙ্গে শেয়ার করবেন না।\nআপনি রেজিস্ট্রেশন না করে থাকলে এই ইমেইলটি উপেক্ষা করুন।`,
    message: layout({
      title,
      preheader:
        "অ্যাকাউন্ট যাচাইয়ের জন্য আপনার OTP কোড। কোডটি ১০ মিনিটের জন্য কার্যকর।",
      content:
        paragraph(greeting) +
        paragraph(body) +
        otpBox(otp) +
        paragraph(
          "এই কোডটি ১০ মিনিটের জন্য কার্যকর থাকবে। কোডটি কারও সঙ্গে শেয়ার করবেন না।",
        ) +
        paragraph("আপনি রেজিস্ট্রেশন না করে থাকলে এই ইমেইলটি উপেক্ষা করুন।"),
    }),
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
  const title = 'পাসওয়ার্ড পুনরায় সেট করুন';
  const greeting = `প্রিয় ${name},`;
  const body = 'আপনার অ্যাকাউন্টের পাসওয়ার্ড পুনরায় সেট করার অনুরোধ পেয়েছি। পরবর্তী ধাপে নিচের OTP কোডটি ব্যবহার করুন।';
  const notice = 'আপনি এই অনুরোধ না করে থাকলে ইমেইলটি উপেক্ষা করুন। আপনার পাসওয়ার্ড অপরিবর্তিত থাকবে।';
  return exports.sendEmail({ email, subject: 'পাসওয়ার্ড পুনরায় সেট করার OTP | JMDS',
    text: `${greeting}\n\n${body}\n\nOTP: ${otp}\n\nকোডটি ১০ মিনিটের জন্য কার্যকর। কোডটি কারও সঙ্গে শেয়ার করবেন না।\n\n${notice}`,
    message: layout({ title, preheader: 'পাসওয়ার্ড পুনরায় সেট করার কোড। কোডটি ১০ মিনিটের জন্য কার্যকর।', content:
      paragraph(greeting) + paragraph(body) + otpBox(otp) + paragraph('কোডটি ১০ মিনিটের জন্য কার্যকর। কোডটি কারও সঙ্গে শেয়ার করবেন না।') +
      `<p style="padding:16px;background:#fff6e4;border-left:3px solid #c7a15a;border-radius:6px;line-height:1.9">${escapeHtml(notice)}</p>` }) });
};

exports.sendLoginNotificationEmail = async (email, name, info) => {
  const title = 'আপনার অ্যাকাউন্টে নতুন লগইন';
  const greeting = `প্রিয় ${name},`;
  const notice = 'এই লগইনটি আপনি না করে থাকলে অবিলম্বে পাসওয়ার্ড পরিবর্তন করুন এবং স্কুল কর্তৃপক্ষের সঙ্গে যোগাযোগ করুন।';
  const url = portalUrl('/login');
  return exports.sendEmail({ email, subject: 'আপনার অ্যাকাউন্টে নতুন লগইন — নিরাপত্তা বিজ্ঞপ্তি | JMDS',
    text: `${greeting}\n\nআপনার অ্যাকাউন্টে একটি নতুন লগইন হয়েছে।\n\nসময়: ${info.loginTime}\nIP ঠিকানা: ${info.ipAddress || 'Unknown'}\nডিভাইস: ${info.userAgent || 'Unknown'}\n\n${notice}\n\nলগইন করুন: ${url}\nএই লগইনটি আপনি করে থাকলে কোনো পদক্ষেপের প্রয়োজন নেই।`,
    message: layout({ title, preheader: 'আপনার অ্যাকাউন্টের সাম্প্রতিক লগইনের তথ্য।', content:
      paragraph(greeting) + paragraph('আপনার অ্যাকাউন্টে একটি নতুন লগইন হয়েছে। নিচে লগইনের তথ্য দেখুন।') +
      details([['সময়', info.loginTime], ['IP ঠিকানা', info.ipAddress || 'Unknown'], ['ডিভাইস', info.userAgent || 'Unknown']]) +
      `<p style="padding:16px;background:#fff6e4;border-left:3px solid #c7a15a;border-radius:6px;line-height:1.9">${escapeHtml(notice)}</p>` +
      button('আপনার অ্যাকাউন্টে যান', url) + paragraph('এই লগইনটি আপনি করে থাকলে কোনো পদক্ষেপের প্রয়োজন নেই।') }) });
};
