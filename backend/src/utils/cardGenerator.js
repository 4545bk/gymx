/**
 * Card Generator — Professional gym membership ID card.
 *
 * Design:
 *   - Premium gradient header with gym logo + name
 *   - Large circular member photo (centered)
 *   - Bold member name + ID
 *   - Large QR code for easy scanning
 *   - Professional footer with gym info
 *   - CR80 credit card size (85.6mm × 54mm)
 */
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const https = require('https');
const http = require('http');
const { format } = require('date-fns');

// ─── Card dimensions (CR80: 85.6mm × 54mm) ────────────
const W = 242.4;  // 85.6mm in points
const H = 153.0;  // 54mm in points

// ─── Colors (GymX brand) ───────────────────────────────
const C = {
  headerBg: '#1a1133',
  headerGrad: '#2d1b69',
  accent: '#7c3aed',
  accentLight: '#a78bfa',
  bodyText: '#1C2833',
  bodySecondary: '#5D6D7E',
  footerBg: '#f8f7fc',
  footerText: '#6B7280',
  white: '#FFFFFF',
  placeholderBg: '#7c3aed',
};

// ─── Fetch image from URL or base64 data URI as Buffer ─
function fetchImageBuffer(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);

    // Handle base64 data URIs
    if (url.startsWith('data:image/')) {
      try {
        // Handle SVG data URIs
        if (url.includes('data:image/svg+xml')) {
          return resolve(null); // PDFKit can't render SVG directly, skip
        }
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
 * Generate a professional membership ID card as PDF Buffer.
 */
async function generateMemberCard(member, settings) {
  try {
    settings = settings || {};

    // 1. Generate QR code
    const qrBuffer = await QRCode.toBuffer(member.memberId, {
      type: 'png',
      width: 300,
      margin: 1,
      color: { dark: '#1a1133', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });

    // 2. Fetch photo (logo handled separately since SVG won't work in PDFKit)
    const photoBuffer = member.photoUrl ? await fetchImageBuffer(member.photoUrl) : null;

    // 3. Issue date
    const rawDate = member.card?.issuedAt || new Date();
    const issueDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
    let issueDateStr;
    try {
      issueDateStr = format(issueDate, 'dd/MM/yyyy');
    } catch (e) {
      issueDateStr = new Date().toLocaleDateString('en-GB');
    }

    // 4. Build PDF
    const doc = new PDFDocument({
      size: [W, H],
      margin: 0,
      info: {
        Title: `GymX Card — ${member.fullName}`,
        Author: 'GymX Gym Management System',
      },
    });

    // ═══════════════════════════════════════════════════════
    // BACKGROUND — subtle gradient feel
    // ═══════════════════════════════════════════════════════
    doc.rect(0, 0, W, H).fill('#ffffff');

    // ═══════════════════════════════════════════════════════
    // LEFT ACCENT BAR (8pt wide, full height)
    // ═══════════════════════════════════════════════════════
    doc.rect(0, 0, 8, H).fill(C.accent);

    // ═══════════════════════════════════════════════════════
    // HEADER BAND (top 42pt)
    // ═══════════════════════════════════════════════════════
    const headerH = 42;
    doc.rect(8, 0, W - 8, headerH).fill(C.headerBg);

    // Gym name (left-aligned, bold)
    const gymName = settings.gymName || 'GymX';
    const nameSize = gymName.length > 18 ? 10 : 13;
    doc.font('Helvetica-Bold').fontSize(nameSize).fillColor(C.white);
    doc.text(gymName, 16, 10, { width: W - 100 });

    // Tagline
    const tagline = settings.tagline || '';
    if (tagline) {
      doc.font('Helvetica').fontSize(6.5).fillColor(C.accentLight);
      doc.text(tagline, 16, 26, { width: W - 100, lineBreak: false });
    }

    // "MEMBER" label (right side of header)
    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.accentLight);
    doc.text('MEMBER', W - 60, 16, { width: 52, align: 'right' });

    // ═══════════════════════════════════════════════════════
    // BODY (42pt → 125pt)
    // ═══════════════════════════════════════════════════════
    const bodyY = headerH + 6;

    // ─── Left: Photo + Info ──────────────────────────────
    const photoSize = 52;
    const photoX = 16;
    const photoY = bodyY + 2;
    const photoCX = photoX + photoSize / 2;
    const photoCY = photoY + photoSize / 2;

    if (photoBuffer) {
      doc.save();
      doc.circle(photoCX, photoCY, photoSize / 2).clip();
      try {
        doc.image(photoBuffer, photoX, photoY, { width: photoSize, height: photoSize });
      } catch (e) {
        doc.circle(photoCX, photoCY, photoSize / 2).fill(C.placeholderBg);
        doc.font('Helvetica-Bold').fontSize(18).fillColor(C.white);
        doc.text(getInitials(member.fullName), photoX, photoY + 15, { width: photoSize, align: 'center' });
      }
      doc.restore();
    } else {
      // Purple circle with initials
      doc.circle(photoCX, photoCY, photoSize / 2).fill(C.placeholderBg);
      doc.font('Helvetica-Bold').fontSize(18).fillColor(C.white);
      doc.text(getInitials(member.fullName), photoX, photoY + 15, { width: photoSize, align: 'center' });
    }

    // Thin circle border around photo
    doc.circle(photoCX, photoCY, photoSize / 2 + 1).lineWidth(0.5).stroke(C.accent);

    // Member name (right of photo)
    const infoX = photoX + photoSize + 8;
    const infoW = W - infoX - 90;

    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.bodyText);
    doc.text(member.fullName, infoX, bodyY + 6, { width: infoW, lineBreak: true });

    // Member ID
    doc.font('Courier').fontSize(7).fillColor(C.accent);
    doc.text(member.memberId, infoX, bodyY + 30, { width: infoW });

    // Issue date
    doc.font('Helvetica').fontSize(6).fillColor(C.bodySecondary);
    doc.text(`Issued: ${issueDateStr}`, infoX, bodyY + 42, { width: infoW });

    // ─── Right: QR code ──────────────────────────────────
    const qrSize = 68;
    const qrX = W - qrSize - 12;
    const qrY = bodyY;

    // QR background (white rounded rect)
    doc.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 4).fill('#ffffff');
    doc.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 4).lineWidth(0.5).stroke('#e5e7eb');
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

    // "SCAN" label under QR
    doc.font('Helvetica-Bold').fontSize(5).fillColor(C.bodySecondary);
    doc.text('SCAN TO CHECK IN', qrX - 3, qrY + qrSize + 5, { width: qrSize + 6, align: 'center' });

    // ═══════════════════════════════════════════════════════
    // FOOTER (bottom 25pt)
    // ═══════════════════════════════════════════════════════
    const footerH = 22;
    const footerY = H - footerH;

    doc.rect(8, footerY, W - 8, footerH).fill(C.footerBg);

    // Divider line
    doc.moveTo(16, footerY).lineTo(W - 12, footerY).lineWidth(0.5).stroke('#e5e7eb');

    // Contact info
    const contactParts = [];
    if (settings.phone) contactParts.push(`☎ ${settings.phone}`);
    if (settings.address) contactParts.push(settings.address);
    const contactStr = contactParts.join('  •  ') || 'Scan QR code at gym entrance';

    doc.font('Helvetica').fontSize(5.5).fillColor(C.footerText);
    doc.text(contactStr, 16, footerY + 7, { width: W - 28, align: 'center' });

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
