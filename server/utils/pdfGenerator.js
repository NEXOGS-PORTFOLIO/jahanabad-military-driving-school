const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { createHash } = require('crypto');
const QRCode = require('qrcode');

// Increment when the layout changes so existing certificates are regenerated.
const CERTIFICATE_DESIGN_VERSION = 'reference-2026-10-script-body-v21';
const assets = path.join(__dirname, '../assets/certificate');
const certificateFonts = () => {
  return {
    Heading: path.join(assets, 'fonts/OldEnglishTextMT.ttf'),
    Signature: path.join(assets, 'fonts/MonotypeCorsiva.ttf'),
    Detail: path.join(assets, 'fonts/Georgia-Regular.ttf'),
    Emphasis: path.join(assets, 'fonts/Lobster-Regular.ttf'),
    Body: path.join(assets, 'fonts/Lobster-Regular.ttf')
  };
};
const certificateFontFingerprint = () => {
  const hash = createHash('sha256');
  for (const [role, file] of Object.entries(certificateFonts())) hash.update(role).update(fs.readFileSync(file));
  return hash.digest('hex');
};
const certificateRelation = gender => {
  const value = String(gender || '').trim().toLowerCase();
  return value === 'male' ? 'Son of' : value === 'female' ? 'Daughter of' : 'Child of';
};
const formatDate = (value, day = '2-digit') => {
  if (!value || Number.isNaN(new Date(value).getTime())) return '';
  return new Date(value).toLocaleDateString('en-GB', {
    day, month: 'long', year: 'numeric', timeZone: 'Asia/Dhaka'
  });
};

/** Shared, single-page certificate design for previews and downloads. */
const generateCertificatePDF = async data => {
  const siteUrl = (process.env.CLIENT_URL || 'https://jmdschool.com').split(',')[0].trim().replace(/\/$/, '');
  const verificationUrl = `${siteUrl}/certificate-verify?certificateId=${encodeURIComponent(data.certificateId)}`;
  const qr = await QRCode.toBuffer(verificationUrl, {
    type: 'png', width: 256, margin: 1, errorCorrectionLevel: 'M',
    color: { dark: '#161612', light: '#fffff000' }
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0,
      info: { Title: `Certificate ${data.certificateId}`, Author: 'Jahanabad Military Driving School' } });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
    try {
      for (const [role, file] of Object.entries(certificateFonts())) doc.registerFont(role, file);
      // Coordinates follow the reference's 500 x 367 canvas, scaled to A4.
      doc.scale(doc.page.width / 500, doc.page.height / 367);
      doc.rect(0, 0, 500, 367).fill('#fffff0');
      doc.rect(1, 1, 498, 365).lineWidth(1).stroke('#687090');
      doc.image(path.join(assets, 'border.certificate.png'), 3, 12, { width: 494, height: 344 });
      doc.image(path.join(assets, 'badge.certificate.png'), 38, 34, { width: 63, height: 67 });

      // Keep each text run within its own column. Body rows share an alphabetic
      // baseline so the regular script labels and emphasized details sit together.
      const text = (value, x, y, width, font, size, align = 'left', baseline = 'top') => {
        const content = String(value || '').replace(/[\r\n]+/g, ' ');
        doc.font(font).fontSize(size).fillColor('#171711');
        const measured = doc.widthOfString(content);
        if (measured > width) doc.fontSize(size * width / measured);
        // Render solid glyphs: paper-colored outlines erase fine italic strokes.
        doc.text(content, x, y, { width, align, baseline, lineBreak: false, fill: true, stroke: false });
      };
      // The reference body uses the same script face for labels and filled details.
      const rule = (x, y, width) => {
        doc.save().moveTo(x, y + 13).lineTo(x + width, y + 13)
          .lineWidth(0.45).dash(0.35, { space: 1.1 }).stroke('#8f8b7c').restore();
      };
      const field = (value, x, y, width) => {
        rule(x, y, width);
        text(value, x + 4, y + 11, width - 8, 'Emphasis', 12, 'left', 'alphabetic');
      };
      const periodField = (start, end, x, y, width) => {
        const parts = [
          start && { value: start, font: "Emphasis" },
          start && end && { value: " to ", font: "Emphasis" },
          end && { value: end, font: "Emphasis" },
        ].filter(Boolean);
        const measured = parts.map(part => doc.font(part.font).fontSize(12).widthOfString(part.value));
        const total = measured.reduce((sum, item) => sum + item, 0);
        const scale = total ? Math.min(1, (width - 8) / total) : 1;
        let cursor = x + 4;
        rule(x, y, width);
        parts.forEach((part, index) => {
          text(part.value, cursor, y + 11, measured[index] * scale + 0.01, part.font, 12 * scale, 'left', 'alphabetic');
          cursor += measured[index] * scale;
        });
      };

      // Reserve a separate serial line inside the ornament, above the headings.
      text(`Serial: ${data.certificateId}`, 300, 40, 138, 'Detail', 7.5, 'right');
      // All three heading lines share the page center (250); the title's
      // symmetric inset also leaves clearance beside the badge.
      text('Jahanabad Military Driving School', 108, 58, 284, 'Heading', 21, 'center');
      text('Jahanabad cantonment, Khulna', 108, 85, 284, 'Heading', 15.5, 'center');
      text('This Is to Certify That', 125, 114, 250, 'Heading', 17, 'center');

      const relation = certificateRelation(data.studentGender);
      const relationWidth = doc.font('Body').fontSize(11.5).widthOfString(relation) + 8;
      field(data.studentName, 45, 145, 170);
      text(relation.toLowerCase(), 219, 156, relationWidth, 'Body', 11.5, 'left', 'alphabetic');
      field(data.fatherName, 219 + relationWidth, 145, 213 - relationWidth);
      text('has', 436, 156, 18, 'Body', 11.5, 'right', 'alphabetic');
      text('Successfully Completed the', 45, 180, 134, 'Body', 11.5, 'left', 'alphabetic');
      field(data.courseName, 182, 169, 232);
      text('at This', 418, 180, 36, 'Body', 11.5, 'right', 'alphabetic');
      text('institution with effect from', 45, 204, 134, 'Body', 11.5, 'left', 'alphabetic');
      periodField(formatDate(data.startDate, 'numeric'), formatDate(data.endDate, 'numeric'), 182, 193, 254);
      text('In', 440, 204, 14, 'Body', 11.5, 'right', 'alphabetic');
      const gender = String(data.studentGender || '').trim().toLowerCase();
      const pronoun = gender === 'female' ? 'she' : gender === 'male' ? 'he' : 'the student';
      text(`testimony thereof ${pronoun} is Awarded with this certificate.`, 45, 228, 409, 'Body', 11.5, 'left', 'alphabetic');

      doc.image(qr, 45, 252, { width: 35, height: 35 });
      doc.link(45, 252, 35, 35, verificationUrl);
      text('Jahanabad Cantonment', 45, 291, 119, 'Signature', 10);
      text('Khulna', 45, 303, 119, 'Signature', 10);
      text(`Date: ${formatDate(data.issuedDate)}`, 45, 315, 124, 'Signature', 10);
      text('Lieutenant Colonel', 178, 291, 142, 'Signature', 11, 'left');
      text('Principal', 178, 303, 142, 'Signature', 11, 'left');
      text('Jahanabad Military Driving School', 178, 315, 142, 'Signature', 11, 'left');
      text('Brigadier General', 335, 291, 117, 'Signature', 11, 'left');
      text('Commandant', 335, 303, 117, 'Signature', 11, 'left');
      text('Army Service Corps Centre & School', 335, 315, 117, 'Signature', 11, 'left');
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
};

module.exports = { generateCertificatePDF, certificateRelation, CERTIFICATE_DESIGN_VERSION, certificateFontFingerprint };
