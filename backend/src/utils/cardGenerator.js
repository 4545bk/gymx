/**
 * Card Generator — Generates printable permanent membership ID cards.
 *
 * Design philosophy:
 *   - Card is a PERMANENT identity document (like an employee badge)
 *   - QR encodes ONLY the memberId — validated at scan time
 *   - NO expiry date, NO plan name, NO price on the card
 *   - Card is printed ONCE; reprints get the same issuedAt date
 *   - Standard CR80 credit card size (85.6mm × 54mm)
 *   - Uses PDFKit (same library as receiptGenerator.js)
 */
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const https = require('https');
const http = require('http');
const { format } = require('date-fns');

// ─── Card dimensions (CR80: 85.6mm × 54mm) ────────────
const W = 242.4;  // 85.6mm in points
const H = 153.0;  // 54mm in points

// ─── Layout zones ──────────────────────────────────────
const HEADER_H = 40;
const FOOTER_H = 28;
const BODY_H = H - HEADER_H - FOOTER_H; // 85pt

// ─── Colors (matches GymX design system) ───────────────
const C = {
  headerBg: '#1A3C5E',
  headerText: '#FFFFFF',
  bodyText: '#1C2833',
  bodySecondary: '#5D6D7E',
  footerBg: '#F2F3F4',
  footerText: '#5D6D7E',
  placeholderBg: '#D5D8DC',
};

// ─── Fetch image from URL or base64 data URI as Buffer ─
function fetchImageBuffer(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);

    // Handle base64 data URIs (stored member photos)
    if (url.startsWith('data:image/')) {
      try {
        const base64Data = url.split(',')[1];
        if (!base64Data) return resolve(null);
        return resolve(Buffer.from(base64Data, 'base64'));
      } catch (e) { return resolve(null); }
    }

    // Handle HTTP/HTTPS URLs
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 5000 }, (res) => {
      if (res.statusCode !== 200) return resolve(null);
      const ct = (res.headers['content-type'] || '').toLowerCase();
      if (!ct.includes('png') && !ct.includes('jpeg') && !ct.includes('jpg')) return resolve(null);
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// ─── Get initials from full name ───────────────────────
function getInitials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/**
 * Generate a permanent membership ID card as a PDF Buffer.
 * Pure utility — no Express req/res objects.
 *
 * @param {Object} member   - Member document (needs memberId, fullName, photoUrl, card.issuedAt)
 * @param {Object} settings - Gym settings (gymName, logoUrl, cardShowLogo, tagline, address)
 * @returns {Promise<Buffer>} - PDF file buffer
 */
async function generateMemberCard(member, settings) {
  try {
  // Ensure settings is a valid object
  settings = settings || {};

  // 1. Generate QR code (encodes ONLY memberId)
  const qrBuffer = await QRCode.toBuffer(member.memberId, {
    type: 'png',
    width: 240,
    margin: 1,
    color: { dark: C.headerBg, light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });

  // 2. Fetch images in parallel (fail silently)
  const [logoBuffer, photoBuffer] = await Promise.all([
    settings.cardShowLogo && settings.logoUrl ? fetchImageBuffer(settings.logoUrl) : null,
    member.photoUrl ? fetchImageBuffer(member.photoUrl) : null,
  ]);

  // 3. Determine issue date (first print uses today, reprints use stored date)
  const rawDate = member.card?.issuedAt || new Date();
  const issueDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
  let issueDateStr;
  try {
    issueDateStr = format(issueDate, 'dd/MM/yyyy');
  } catch (e) {
    issueDateStr = new Date().toLocaleDateString('en-GB');
  }

  // 4. Build the PDF
  const doc = new PDFDocument({
    size: [W, H],
    margin: 0,
    info: {
      Title: `GymX Card — ${member.fullName}`,
      Author: 'GymX Gym Management System',
    },
  });

  // ═══════════════════════════════════════════════════════
  // HEADER BAND (0 → 40pt)
  // ═══════════════════════════════════════════════════════
  doc.rect(0, 0, W, HEADER_H).fill(C.headerBg);

  let headerTextX = 10;

  // Logo (32×32, left-aligned in header)
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, 8, 4, { width: 32, height: 32 });
      headerTextX = 44;
    } catch (e) { /* skip logo on error */ }
  }

  // Gym name
  const gymName = settings.gymName || 'GymX';
  const nameFontSize = gymName.length > 18 ? 9 : 11;
  doc.font('Helvetica-Bold').fontSize(nameFontSize).fillColor(C.headerText);
  doc.text(gymName, headerTextX, logoBuffer ? 8 : 10, {
    width: W - headerTextX - 8,
  });

  // Tagline / address (small, under gym name)
  const subtitle = settings.tagline || settings.address || '';
  if (subtitle) {
    doc.font('Helvetica').fontSize(6).fillColor('#8ab4d8');
    doc.text(subtitle, headerTextX, logoBuffer ? 22 : 24, {
      width: W - headerTextX - 8,
      lineBreak: false,
    });
  }

  // ═══════════════════════════════════════════════════════
  // BODY (40pt → 125pt)
  // ═══════════════════════════════════════════════════════
  const bodyY = HEADER_H;
  const bodyPad = 10;
  const leftColW = W - 80 - bodyPad * 2 - 10; // left column width
  const qrSize = 80;
  const qrX = W - qrSize - bodyPad;
  const qrY = bodyY + (BODY_H - qrSize) / 2;

  // ─── Left column: photo, name, ID ────────────────────
  let ly = bodyY + 8;

  // Member photo or initials placeholder
  const photoSize = 45;
  const photoX = bodyPad;
  const photoCenterX = photoX + photoSize / 2;
  const photoCenterY = ly + photoSize / 2;

  if (photoBuffer) {
    // Circle-clip the photo
    doc.save();
    doc.circle(photoCenterX, photoCenterY, photoSize / 2).clip();
    try {
      doc.image(photoBuffer, photoX, ly, { width: photoSize, height: photoSize });
    } catch (e) {
      // Fallback to initials on image error
      doc.circle(photoCenterX, photoCenterY, photoSize / 2).fill(C.placeholderBg);
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#ffffff');
      doc.text(getInitials(member.fullName), photoX, ly + 13, { width: photoSize, align: 'center' });
    }
    doc.restore();
  } else {
    // Gray circle with initials
    doc.circle(photoCenterX, photoCenterY, photoSize / 2).fill(C.placeholderBg);
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#ffffff');
    doc.text(getInitials(member.fullName), photoX, ly + 13, { width: photoSize, align: 'center' });
  }

  // Member name (to the right of photo)
  const nameX = photoX + photoSize + 6;
  const nameW = leftColW - photoSize - 6;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.bodyText);
  doc.text(member.fullName, nameX, ly + 6, { width: nameW, lineBreak: true });

  // Member ID (monospace, gray)
  doc.font('Courier').fontSize(7.5).fillColor(C.bodySecondary);
  doc.text(member.memberId, nameX, ly + 28, { width: nameW });

  // ─── Right column: QR code ───────────────────────────
  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

  // ═══════════════════════════════════════════════════════
  // FOOTER BAND (125pt → 153pt)
  // ═══════════════════════════════════════════════════════
  const footerY = H - FOOTER_H;
  doc.rect(0, footerY, W, FOOTER_H).fill(C.footerBg);

  // Left: scan instruction
  doc.font('Helvetica-Oblique').fontSize(7).fillColor(C.footerText);
  doc.text('Scan QR code at entrance', bodyPad, footerY + 10, { width: W / 2 });

  // Right: issue date
  doc.font('Helvetica').fontSize(7).fillColor(C.footerText);
  doc.text(`Issued: ${issueDateStr}`, W / 2, footerY + 10, {
    width: W / 2 - bodyPad,
    align: 'right',
  });

  // 5. Return PDF as Buffer
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });

  } catch (err) {
    const error = new Error(`Card generation failed for ${member?.memberId || 'unknown'}: ${err.message}`);
    error.statusCode = 500;
    error.code = 'CARD_GENERATION_FAILED';
    throw error;
  }
}

module.exports = { generateMemberCard };
