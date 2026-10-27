const { escapeHtml } = require('./escapeHtml');
const { layout, paragraph, details, button, portalUrl: getPortalUrl } = require('./emailLayout');

module.exports = ({ studentName, courseName, certificateId, enrollmentId }) => {
  const portalUrl = getPortalUrl('/student-dashboard/certificates');
  const title = 'কোর্স সম্পন্ন হয়েছে — আপনার সনদ প্রস্তুত';
  const greeting = `প্রিয় ${studentName},`;
  const announcement = `অভিনন্দন! আপনি জাহানাবাদ মিলিটারি ড্রাইভিং স্কুলে ‘${courseName}’ কোর্সটি সফলভাবে সম্পন্ন করেছেন। আপনার সনদ এখন স্টুডেন্ট পোর্টাল থেকে ডাউনলোড করার জন্য প্রস্তুত।`;
  const steps = ['আপনার নিবন্ধিত ইমেইল ঠিকানা দিয়ে স্টুডেন্ট অ্যাকাউন্টে লগইন করুন।',
    'স্টুডেন্ট পোর্টালের সনদ (Certificates) বিভাগে যান।',
    `‘${courseName}’ কোর্সের সনদটি খুঁজুন (সনদ নম্বর: ${certificateId}) এবং ডাউনলোড (Download) বাটনে ক্লিক করুন।`];
  return {
    subject: `${title} | Jahanabad Military Driving School`,
    messageId: `<course-completion-${enrollmentId}@${new URL(portalUrl).hostname}>`,
    text: `${greeting}\n\n${announcement}\n\nসনদ নম্বর: ${certificateId}\n\nআপনার সনদ দেখুন: ${portalUrl}\n\n${steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}\n\nআপনার ভবিষ্যৎ সাফল্য ও নিরাপদ যাত্রা কামনা করছি।\nJahanabad Military Driving School`,
    message: layout({
      title,
      preheader: `${courseName} কোর্সের সনদ স্টুডেন্ট পোর্টালে প্রস্তুত।`,
      content:
        paragraph(greeting) +
        paragraph(announcement) +
        details([
          ["কোর্স", courseName],
          ["সনদ নম্বর", certificateId],
        ]) +
        button("স্টুডেন্ট পোর্টাল খুলুন", portalUrl) +
        '<h2 style="font-size:17px;margin:24px 0 12px">সনদ ডাউনলোড করার নিয়ম</h2>' +
        `<ol style="padding-left:24px;line-height:2">${steps.map((step) => `<li style="margin-bottom:8px">${escapeHtml(step)}</li>`).join("")}</ol>` +
        paragraph("বাটনটি কাজ না করলে নিচের লিংকটি ব্যবহার করুন:") +
        `<p style="overflow-wrap:anywhere"><a href="${escapeHtml(portalUrl)}" style="color:#2c5f2d">${escapeHtml(portalUrl)}</a></p>` +
        paragraph("আপনার ভবিষ্যৎ সাফল্য ও নিরাপদ যাত্রা কামনা করছি।"),
    }),
  };
};
