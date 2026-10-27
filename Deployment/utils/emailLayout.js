const { escapeHtml } = require('./escapeHtml');

const portalUrl = path => {
  const origin = (process.env.CLIENT_URL || 'https://jmdschool.com').split(',')[0].trim();
  const url = new URL(path, origin);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid portal URL');
  return url.toString();
};
const paragraph = text => `<p style="margin:0 0 18px;font-size:15px;line-height:1.9">${escapeHtml(text)}</p>`;
const details = entries => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f7ec;border:1px solid #dfe9d7;border-radius:10px;margin:20px 0">${entries.map(([label, value]) => `<tr><td style="padding:12px 18px;font-size:13px;color:#64725c;vertical-align:top;width:32%">${escapeHtml(label)}</td><td style="padding:12px 18px 12px 0;font-size:14px;font-weight:bold;overflow-wrap:anywhere;vertical-align:top">${escapeHtml(value)}</td></tr>`).join('')}</table>`;
const button = (label, url) => `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0"><tr><td bgcolor="#2c5f2d" style="border-radius:8px"><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 24px;color:#fff;font-size:15px;font-weight:bold;text-decoration:none;border:1px solid #2c5f2d;border-radius:8px">${escapeHtml(label)}</a></td></tr></table>`;
const otpBox = otp => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background:#f2f7ec;border:1px solid #dfe9d7;border-radius:10px"><tr><td align="center" style="padding:18px;color:#64725c;font-size:13px">আপনার যাচাইকরণ কোড</td></tr><tr><td dir="ltr" align="center" style="padding:0 18px 24px;font-family:Consolas,'Courier New',monospace;font-size:36px;letter-spacing:8px;font-weight:bold;color:#2c5f2d">${escapeHtml(otp)}</td></tr></table>`;
const layout = ({ title, preheader, content, lang = 'bn' }) => `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f3f7f0;font-family:'Nirmala UI','Noto Sans Bengali',Arial,sans-serif;color:#23382a">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f3f7f0;font-size:1px;line-height:1px;mso-hide:all">${escapeHtml(preheader || title)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f3f7f0"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="620" cellspacing="0" cellpadding="0" style="width:100%;max-width:620px;background:#fff;border:1px solid #e0e8dc;border-radius:14px">
<tr><td bgcolor="#203f2b" style="padding:28px 24px;border-radius:14px 14px 0 0;color:#fff;border-bottom:4px solid #97bc62"><p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:1px;color:#dce8cf">JAHANABAD MILITARY DRIVING SCHOOL</p><h1 style="margin:0;font-size:24px;line-height:1.5;font-weight:bold;color:#fff">${escapeHtml(title)}</h1></td></tr>
<tr><td style="padding:28px 24px;font-size:15px;line-height:1.9;overflow-wrap:anywhere">${content}</td></tr>
<tr><td bgcolor="#f8faf5" style="padding:20px 24px;border-top:1px solid #e3ebdd;border-radius:0 0 14px 14px"><p style="margin:0 0 5px;font-size:13px;font-weight:bold;color:#38573a">Jahanabad Military Driving School</p><p style="margin:0;font-size:12px;line-height:1.8;color:#6a7865">Jahanabad Cantonment, Khan Jahan Ali, Khulna<br>01769-564999${process.env.EMAIL_USER ? `<br><a style="color:#456f39;text-decoration:none" href="mailto:${escapeHtml(process.env.EMAIL_USER)}">${escapeHtml(process.env.EMAIL_USER)}</a>` : ''}</p></td></tr>
</table></td></tr></table></body></html>`;

module.exports = { layout, paragraph, details, button, otpBox, portalUrl };
