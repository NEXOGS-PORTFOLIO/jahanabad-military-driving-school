const { test } = require('node:test');
const assert = require('node:assert/strict');
const PDFDocument = require('pdfkit');
const { generateCertificatePDF } = require('../utils/pdfGenerator');

test('certificate text stays inside the border with no overlapping runs or badge/QR collisions', async () => {
  for (const longValues of [false, true]) {
    const runs = [];
    const original = PDFDocument.prototype.text;
    PDFDocument.prototype.text = function(value, x, y, options) {
      assert.equal(options.fill, true);
      assert.equal(options.stroke, false, 'Text must use solid glyphs without outlines that erase fine strokes');
      const width = this.widthOfString(value);
      const offset = options.align === 'center' ? (options.width - width) / 2
        : options.align === 'right' ? options.width - width : 0;
      const top = options.baseline === 'alphabetic' ? y - this._font.ascender * this._fontSize / 1000 : y;
      runs.push({ text: value, x: x + offset, y: top, width, height: this.currentLineHeight(), size: this._fontSize, font: this._font.name });
      return original.call(this, value, x, y, options);
    };
    try {
      await generateCertificatePDF({
        certificateId: longValues ? 'JMDS-2028-99999999' : 'JMDS-2026-00000404',
        studentName: longValues ? 'A very long student name '.repeat(8) : 'Alfat Tasnim Hasan',
        fatherName: longValues ? 'A very long father name '.repeat(8) : 'Md. Zillul Hasan',
        courseName: longValues ? 'Professional Heavy Vehicle Training '.repeat(6) : 'Heavy Vehicle Training',
        studentGender: longValues ? 'female' : 'male',
        startDate: '2026-11-01', endDate: '2026-11-30', issuedDate: '2026-10-15'
      });
    } finally {
      PDFDocument.prototype.text = original;
    }
    const overlaps = (a, b) => a.x < b.x + b.width - 0.1 && a.x + a.width > b.x + 0.1
      && a.y < b.y + b.height - 0.1 && a.y + a.height > b.y + 0.1;
    for (const [index, run] of runs.entries()) {
      assert.ok(run.x >= 40 && run.x + run.width <= 460.1, `Horizontal inset: ${run.text}`);
      assert.ok(run.y >= 36 && run.y + run.height <= 330, `Vertical inset: ${run.text}`);
      assert.ok(!overlaps(run, { x: 38, y: 34, width: 63, height: 67 }), `Badge collision: ${run.text}`);
      assert.ok(!overlaps(run, { x: 45, y: 252, width: 35, height: 35 }), `QR collision: ${run.text}`);
      for (const other of runs.slice(index + 1)) assert.ok(!overlaps(run, other), `Text collision: ${run.text} / ${other.text}`);
    }
    assert.equal(runs.filter(run => run.font === 'Georgia-BoldItalic').length, 6);
    for (const run of runs.filter(run => run.font !== 'Georgia-BoldItalic')) assert.doesNotMatch(run.font, /Bold|Lobster|Ariston/i);
    assert.equal(runs.find(run => run.text === ' to ').font, 'Georgia-BoldItalic');
    const emphasized = runs.filter(run => run.font === 'Georgia-BoldItalic' && run.text !== ' to ');
    assert.ok(Math.abs(emphasized[0].x + emphasized[0].width / 2 - (45 + 173 / 2)) < 0.1);
    assert.ok(Math.abs(emphasized[2].x + emphasized[2].width / 2 - (175 + 236 / 2)) < 0.1);
    assert.ok(Math.abs((emphasized[3].x + emphasized[4].x + emphasized[4].width) / 2 - (175 + 259 / 2)) < 0.1);
    const serial = runs.find(run => run.text.startsWith('Serial:'));
    const headings = runs.filter(run => run.font === 'OldEnglishTextMT');
    assert.equal(headings.length, 3);
    for (const heading of headings) {
      assert.ok(Math.abs(heading.x + heading.width / 2 - 250) < 0.1, `Heading center: ${heading.text}`);
    }
    assert.ok(serial.x + serial.width <= 438.1);
    assert.equal(serial.size, 7.5);
    for (const run of runs.filter(run => /Alfat|Zillul|Vehicle Training|November/.test(run.text))) {
      assert.equal(run.font, 'Georgia-BoldItalic');
    }
  }
});
