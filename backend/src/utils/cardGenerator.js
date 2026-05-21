/**
 * Card Generator — Professional gym membership ID card.
 *
 * Design:
 *   - Premium gradient header with gym logo + name
 *   - Large circular member photo (centered)
 *   - Bold member name + ID
 *   - Plan type badge (e.g. "FULL WEEK", "3-DAY / WEEK")
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

// ─── Plan type display formatting ──────────────────────
function formatPlanLabel(type) {
  if (!type) return 'MEMBER';
  const t = type.toLowerCase();
  if (t === '3-day') return '3-DAY / WEEK';
  if (t === 'full-week') return 'FULL WEEK';
  if (t === 'monthly') return 'MONTHLY';
  return type.toUpperCase().replace(/-/g, ' ');
}

// ─── Fetch image from URL or base64 data URI as Buffer ─
function fetchImageBuffer(url) {
  return new Promise((resolve) => {
    try {
      if (!url) return resolve(null);

      // Trim any whitespace
      url = String(url).trim();

      // Handle ALL data: URIs (not just data:image/)
      if (url.startsWith('data:')) {
        try {
          // Only check MIME type (before the comma), NOT the base64 payload
          const mimeHeader = url.split(',')[0].toLowerCase(); // e.g. "data:image/png;base64"

          // PDFKit can't render SVG directly, skip
          if (mimeHeader.includes('svg')) {
            return resolve(null);
          }
          // Only process image data URIs
          if (!mimeHeader.includes('image/')) {
            return resolve(null);
          }
          const base64Data = url.split(',')[1];
          if (!base64Data) return resolve(null);
          return resolve(Buffer.from(base64Data, 'base64'));
        } catch (e) { return resolve(null); }
      }

      // Only allow http/https URLs
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return resolve(null);
      }

      // Handle HTTP/HTTPS URLs (Cloudinary, etc.)
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { timeout: 8000 }, (res) => {
        // Follow redirects (3xx)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchImageBuffer(res.headers.location).then(resolve);
          return;
        }
        if (res.statusCode !== 200) return resolve(null);
        const ct = (res.headers['content-type'] || '').toLowerCase();
        if (!ct.includes('image/')) return resolve(null);
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', () => resolve(null));
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    } catch (e) {
      // Catch any synchronous errors (e.g. invalid URL protocol)
      resolve(null);
    }
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

    // 2. Fetch photo
    const photoBuffer = member.photoUrl ? await fetchImageBuffer(member.photoUrl) : null;

    // 3. Fetch logo (if available and renderable — skip SVG)
    let logoBuffer = null;
    if (settings.cardShowLogo !== false && settings.logoUrl) {
      const logoUrlPreview = settings.logoUrl.substring(0, 60);
      console.log('[CARD] Logo URL type:', logoUrlPreview + '...');
      logoBuffer = await fetchImageBuffer(settings.logoUrl);
      console.log('[CARD] Logo buffer:', logoBuffer ? `${logoBuffer.length} bytes` : 'null (skipped/SVG)');
    } else {
      console.log('[CARD] Logo skipped:', settings.cardShowLogo === false ? 'disabled in settings' : 'no logoUrl');
    }

    // 4. Issue date
    const rawDate = member.card?.issuedAt || new Date();
    const issueDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
    let issueDateStr;
    try {
      issueDateStr = format(issueDate, 'dd/MM/yyyy');
    } catch (e) {
      issueDateStr = new Date().toLocaleDateString('en-GB');
    }

    // 5. Plan info
    const planType = member.plan?.type;
    const planLabel = formatPlanLabel(planType);
    let expiryStr = '';
    if (member.plan?.expiryDate) {
      try {
        expiryStr = format(new Date(member.plan.expiryDate), 'dd MMM yyyy');
      } catch (e) {
        expiryStr = '';
      }
    }

    // 6. Build PDF
    const doc = new PDFDocument({
      size: [W, H],
      margin: 0,
      info: {
        Title: 'GymX Card - ' + member.fullName,
        Author: 'GymX Gym Management System',
      },
    });

    // ═══════════════════════════════════════════════════════
    // BACKGROUND
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

    // ─── Logo (left side of header) ──────────────────────
    const logoSize = 24;
    const logoX = 14;
    const logoY = 9;
    let textStartX = 16;

    if (logoBuffer) {
      try {
        doc.image(logoBuffer, logoX, logoY, { width: logoSize, height: logoSize });
        textStartX = logoX + logoSize + 6;
        console.log('[CARD] Logo embedded successfully');
      } catch (e) {
        console.error('[CARD] Logo embed failed:', e.message);
        textStartX = 16;
      }
    } else {
      console.log('[CARD] No logo buffer — text-only header');
    }

    // Gym name (left-aligned, bold)
    const gymName = settings.gymName || 'GymX';
    const nameSize = gymName.length > 18 ? 9 : gymName.length > 12 ? 11 : 13;
    doc.font('Helvetica-Bold').fontSize(nameSize).fillColor(C.white);
    doc.text(gymName, textStartX, 10, { width: W - textStartX - 80 });

    // Tagline
    const tagline = settings.tagline || '';
    if (tagline) {
      doc.font('Helvetica').fontSize(6).fillColor(C.accentLight);
      doc.text(tagline, textStartX, 26, { width: W - textStartX - 80, lineBreak: false });
    }

    // "MEMBER" label (right side of header)
    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.accentLight);
    doc.text('MEMBER', W - 60, 16, { width: 52, align: 'right' });

    // ═══════════════════════════════════════════════════════
    // BODY (42pt -> footer)
    // ═══════════════════════════════════════════════════════
    const bodyY = headerH + 6;

    // ─── Left: Photo + Info ──────────────────────────────
    const photoSize = 48;
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
        doc.font('Helvetica-Bold').fontSize(16).fillColor(C.white);
        doc.text(getInitials(member.fullName), photoX, photoY + 13, { width: photoSize, align: 'center' });
      }
      doc.restore();
    } else {
      // Purple circle with initials
      doc.circle(photoCX, photoCY, photoSize / 2).fill(C.placeholderBg);
      doc.font('Helvetica-Bold').fontSize(16).fillColor(C.white);
      doc.text(getInitials(member.fullName), photoX, photoY + 13, { width: photoSize, align: 'center' });
    }

    // Thin circle border around photo
    doc.circle(photoCX, photoCY, photoSize / 2 + 1).lineWidth(0.5).stroke(C.accent);

    // ─── Member info (right of photo) ────────────────────
    const infoX = photoX + photoSize + 8;
    const infoW = W - infoX - 90;

    // Member name
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.bodyText);
    doc.text(member.fullName, infoX, bodyY + 2, { width: infoW, lineBreak: true });

    // Member ID
    doc.font('Courier').fontSize(7).fillColor(C.accent);
    doc.text(member.memberId, infoX, bodyY + 16, { width: infoW });

    // ─── Plan type badge (simple text approach — no save/restore) ──
    const badgeY = bodyY + 28;

    // Badge background rectangle
    doc.font('Helvetica-Bold').fontSize(6);
    const badgeTextWidth = doc.widthOfString(planLabel);
    const badgePadX = 5;
    const badgeW = badgeTextWidth + badgePadX * 2;
    const badgeH = 11;
    const badgeRadius = 3;

    doc.roundedRect(infoX, badgeY, badgeW, badgeH, badgeRadius).fill('#ede9fe');

    // Badge text
    doc.font('Helvetica-Bold').fontSize(6).fillColor('#5b21b6');
    doc.text(planLabel, infoX + badgePadX, badgeY + 2.5, { width: badgeTextWidth + 2, lineBreak: false });

    // Expiry or issue date below badge
    if (expiryStr) {
      doc.font('Helvetica').fontSize(5.5).fillColor(C.bodySecondary);
      doc.text('Exp: ' + expiryStr, infoX, badgeY + badgeH + 3, { width: infoW });
    } else {
      doc.font('Helvetica').fontSize(5.5).fillColor(C.bodySecondary);
      doc.text('Issued: ' + issueDateStr, infoX, badgeY + badgeH + 3, { width: infoW });
    }

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
    // FOOTER (bottom 22pt)
    // ═══════════════════════════════════════════════════════
    const footerH = 22;
    const footerY = H - footerH;

    doc.rect(8, footerY, W - 8, footerH).fill(C.footerBg);

    // Divider line
    doc.moveTo(16, footerY).lineTo(W - 12, footerY).lineWidth(0.5).stroke('#e5e7eb');

    // Contact info
    const contactParts = [];
    if (settings.phone) contactParts.push('Tel: ' + settings.phone);
    if (settings.address) contactParts.push(settings.address);
    const contactStr = contactParts.join('  |  ') || 'Scan QR code at gym entrance';

    doc.font('Helvetica').fontSize(5.5).fillColor(C.footerText);
    doc.text(contactStr, 16, footerY + 7, { width: W - 28, align: 'center' });

    // 7. Return PDF as Buffer
    return new Promise((resolve, reject) => {
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });

  } catch (err) {
    console.error('[CARD_GENERATOR] Error:', err.message, err.stack);
    const error = new Error('Card generation failed for ' + (member?.memberId || 'unknown') + ': ' + err.message);
    error.statusCode = 500;
    error.code = 'CARD_GENERATION_FAILED';
    throw error;
  }
}

module.exports = { generateMemberCard };
