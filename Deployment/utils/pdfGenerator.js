const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// Try to require svg2img, but handle if it fails
let svg2img;
try {
  svg2img = require('svg2img');
} catch (e) {
  console.warn('svg2img not available, will use fallback for logo');
}

/**
 * Generate Certificate PDF
 * @param {Object} certificateData - Certificate information
 * @returns {Promise<Buffer>} PDF Buffer
 */
exports.generateCertificatePDF = async (certificateData) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('========================================');
      console.log('Starting Certificate PDF Generation');
      console.log('========================================');
      
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 0,  // Set to 0 to have full control
        autoFirstPage: false, // We'll add the page manually
        bufferPages: false  // Don't buffer pages - single page output
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        console.log('PDF generation completed, size:', pdfData.length, 'bytes');
        console.log('========================================\n');
        resolve(pdfData);
      });
      doc.on('error', (err) => {
        console.error('PDF generation error:', err);
        reject(err);
      });

      // Add ONLY ONE page - A4 landscape is 841.89 x 595.28 points
      doc.addPage();
      console.log('Page added - Size:', doc.page.width, 'x', doc.page.height);

      // Background color
      doc.rect(0, 0, doc.page.width, doc.page.height)
         .fill('#f8f9fa');

      // Border
      doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
         .lineWidth(3)
         .stroke('#2c5530');

      // Inner decorative border
      doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80)
         .lineWidth(1)
         .stroke('#6c757d');

      // Add logo
      const logoPath = path.join(__dirname, '../assets/Untitled-1.svg');
      const centerX = doc.page.width / 2;
      let logoAdded = false;
      
      console.log('Attempting to load logo from:', logoPath);
      
      if (fs.existsSync(logoPath) && svg2img) {
        try {
          // Read SVG file
          const svgBuffer = fs.readFileSync(logoPath);
          console.log('SVG file loaded, size:', svgBuffer.length, 'bytes');
          
          console.log('Converting SVG logo to PNG...');
          
          // Convert SVG to PNG with promisified version for better error handling
          const convertSvg = promisify(svg2img);
          const pngBuffer = await convertSvg(svgBuffer, {
            width: 100,
            height: 100,
            preserveAspectRatio: true
          });
          
          console.log('Logo converted successfully, PNG size:', pngBuffer.length, 'bytes');
          
          // Add PNG image to PDF - centered at top
          doc.image(pngBuffer, centerX - 50, 55, { 
            width: 100,
            height: 100
          });
          
          logoAdded = true;
          console.log('✓ Logo successfully added to certificate PDF');
          
        } catch (error) {
          console.error('✗ Error converting/adding logo:', error.message);
          console.error('Stack:', error.stack);
          logoAdded = false;
        }
      } else {
        if (!fs.existsSync(logoPath)) {
          console.error('✗ Logo file not found at:', logoPath);
        }
        if (!svg2img) {
          console.error('✗ svg2img library not available');
        }
      }
      
      // Fallback to text badge if logo wasn't added
      if (!logoAdded) {
        console.log('→ Using fallback text badge instead of logo');
        doc.save();
        
        // Outer circle
        doc.circle(centerX, 105, 35)
           .lineWidth(3)
           .stroke('#2c5530');
        
        // Inner circle
        doc.circle(centerX, 105, 30)
           .lineWidth(1)
           .stroke('#6c757d');

        // Text
        doc.fontSize(22)
           .fillColor('#2c5530')
           .font('Helvetica-Bold')
           .text('JMDS', centerX - 30, 100, {
             width: 60,
             align: 'center'
           });
        
        doc.restore();
      }

      // Institution Name
      doc.fontSize(26)
         .fillColor('#2c5530')
         .font('Helvetica-Bold')
         .text('Jahanabad Military Driving School', 0, 210, {
           align: 'center',
           width: doc.page.width
         });

      doc.fontSize(13)
         .fillColor('#6c757d')
         .font('Helvetica')
         .text('Khulna, Bangladesh', 0, 242, {
           align: 'center',
           width: doc.page.width
         });

      // Certificate Title
      doc.fontSize(34)
         .fillColor('#2c5530')
         .font('Helvetica-Bold')
         .text('CERTIFICATE OF COMPLETION', 0, 255, {
           align: 'center',
           width: doc.page.width
         });

      // Decorative line
      doc.moveTo(200, 300)
         .lineTo(doc.page.width - 200, 300)
         .lineWidth(2)
         .stroke('#2c5530');

      // This is to certify that
      doc.fontSize(13)
         .fillColor('#333333')
         .font('Helvetica')
         .text('This is to certify that', 0, 325, {
           align: 'center',
           width: doc.page.width
         });

      // Student Name
      doc.fontSize(30)
         .fillColor('#2c5530')
         .font('Helvetica-Bold')
         .text(certificateData.studentName, 0, 352, {
           align: 'center',
           width: doc.page.width
         });

      // Has successfully completed
      doc.fontSize(13)
         .fillColor('#333333')
         .font('Helvetica')
         .text('has successfully completed the course', 0, 397, {
           align: 'center',
           width: doc.page.width
         });

      // Course Name
      doc.fontSize(22)
         .fillColor('#2c5530')
         .font('Helvetica-Bold')
         .text(certificateData.courseName, 0, 423, {
           align: 'center',
           width: doc.page.width
         });

      // Duration
      if (certificateData.courseDuration) {
        doc.fontSize(11)
           .fillColor('#6c757d')
           .font('Helvetica')
           .text(`Duration: ${certificateData.courseDuration}`, 0, 458, {
             align: 'center',
             width: doc.page.width
           });
      }

      // Decorative line
      doc.moveTo(200, 490)
         .lineTo(doc.page.width - 200, 490)
         .lineWidth(1)
         .stroke('#6c757d');

      // Certificate ID and Date
      const leftMargin = 100;
      const rightMargin = doc.page.width - 100;

      // Certificate ID
      doc.fontSize(10)
         .fillColor('#333333')
         .font('Helvetica-Bold')
         .text('Certificate ID:', leftMargin, 515);
      
      doc.fontSize(9)
         .fillColor('#6c757d')
         .font('Helvetica')
         .text(certificateData.certificateId, leftMargin, 531);

      // Issue Date
      const issueDate = new Date(certificateData.issuedDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc.fontSize(10)
         .fillColor('#333333')
         .font('Helvetica-Bold')
         .text('Issue Date:', rightMargin - 150, 515);
      
      doc.fontSize(9)
         .fillColor('#6c757d')
         .font('Helvetica')
         .text(issueDate, rightMargin - 150, 531);

      // Footer - ensure it stays on the same page
      doc.fontSize(8)
         .fillColor('#999999')
         .font('Helvetica')
         .text(`This certificate can be verified at: ${(process.env.CLIENT_URL || 'https://jmdschool.com').split(',')[0].trim().replace(/\/$/, '')}/certificate-verify`, 0, 565, {
           align: 'center',
           width: doc.page.width
         });

      console.log('All content added to certificate');
      console.log('Current Y position:', doc.y);
      console.log('Page height:', doc.page.height);
      
      // Verify we're still on the first page
      if (doc.bufferedPageRange) {
        console.log('Pages buffered:', doc.bufferedPageRange());
      }

      // Finalize PDF - explicitly end to ensure single page output
      // No additional pages will be added after this point
      doc.end();
      console.log('PDF finalized - single page certificate complete');
    } catch (error) {
      console.error('Error in certificate generation:', error);
      reject(error);
    }
  });
};
