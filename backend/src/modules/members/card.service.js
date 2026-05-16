/**
 * Card Service — Generates printable PDF membership cards.
 * 
 * Design decisions:
 *   - pdfkit (server-side, zero browser dependency, ~200ms generation)
 *   - Single card centered on A4 page for standard printer compatibility
 *   - QR generated at 400px for crisp scanning even on low-DPI printers
 *   - Portrait card layout (85mm × 130mm) — larger than credit card for readability
 *   - Monochrome-friendly: looks good in both color and B&W printing
 *   - No stored PDFs: generated on-demand per request (fast enough, avoids stale data)
 */
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const Member = require('../../models/Member');
const { getDaysUntilExpiry } = require('../../utils/dateHelpers');

// ─── Card dimensions (in PDF points, 1pt = 1/72 inch) ───────
const CARD = {
  width: 340,   // ~120mm — slightly wider than credit card
  height: 480,  // ~170mm — portrait orientation
  margin: 24,
  radius: 16,
};

// ─── Colors ──────────────────────────────────────────────────
const COLORS = {
  brand: '#1a3c5e',       // Deep navy — GymX brand
  brandLight: '#2563eb',  // Accent blue
  text: '#1c2833',        // Near-black for print readability
  secondary: '#5d6d7e',   // Gray for labels
  border: '#d5d8dc',      // Light border
  bg: '#f8f9fa',          // Card background
  white: '#ffffff',
  accent: '#06b6d4',      // Cyan accent
};

/**
 * Generate a membership card PDF as a readable stream.
 * @param {string} memberId - The member's memberId string
 * @returns {Promise<{ stream: PDFDocument, filename: string }>}
 */
const generateCardPDF = async (memberId) => {
  // Fetch member data
  const member = await Member.findOne({ memberId })
    .populate('assignedTrainerId', 'fullName')
    .lean();

  if (!member) {
    const err = new Error('Member not found');
    err.statusCode = 404;
    err.code = 'MEMBER_NOT_FOUND';
    throw err;
  }

  // Generate high-resolution QR code as PNG buffer (400px for crisp print)
  const qrBuffer = await QRCode.toBuffer(member.memberId, {
    type: 'png',
    width: 400,
    margin: 1,
    color: { dark: '#1a3c5e', light: '#ffffff' },
    errorCorrectionLevel: 'H', // Highest — survives ~30% damage
  });

  // Create PDF document (A4)
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title: `GymX Membership Card — ${member.fullName}`,
      Author: 'GymX Gym Management System',
      Subject: `Membership card for ${member.memberId}`,
    },
  });

  // ─── Page dimensions ────────────────────────────────────
  const pageWidth = 595.28;  // A4 width in points
  const pageHeight = 841.89; // A4 height in points

  // Center the card on the page
  const cardX = (pageWidth - CARD.width) / 2;
  const cardY = (pageHeight - CARD.height) / 2 - 40; // slightly above center

  // ─── Card background with rounded border ────────────────
  doc.save();
  drawRoundedRect(doc, cardX, cardY, CARD.width, CARD.height, CARD.radius);
  doc.fillColor(COLORS.white).fill();
  doc.restore();

  // Card border
  doc.save();
  drawRoundedRect(doc, cardX, cardY, CARD.width, CARD.height, CARD.radius);
  doc.strokeColor(COLORS.border).lineWidth(1.5).stroke();
  doc.restore();

  // ─── Brand Header Bar ──────────────────────────────────
  const headerH = 64;
  doc.save();
  // Clipped rounded top corners
  drawRoundedRect(doc, cardX, cardY, CARD.width, headerH + CARD.radius, CARD.radius);
  doc.clip();
  doc.rect(cardX, cardY, CARD.width, headerH).fill(COLORS.brand);
  doc.restore();

  // Brand text
  doc.save();
  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.white);
  doc.text('GymX', cardX, cardY + 18, {
    width: CARD.width,
    align: 'center',
  });
  doc.font('Helvetica').fontSize(8).fillColor('#8ab4d8');
  doc.text('MEMBERSHIP CARD', cardX, cardY + 43, {
    width: CARD.width,
    align: 'center',
  });
  doc.restore();

  // ─── Content area ──────────────────────────────────────
  let y = cardY + headerH + 20;
  const contentX = cardX + CARD.margin;
  const contentW = CARD.width - CARD.margin * 2;

  // ─── Photo / Avatar placeholder ────────────────────────
  const photoSize = 64;
  const photoX = cardX + (CARD.width - photoSize) / 2;

  if (member.photoUrl) {
    // If photo exists, draw a placeholder circle (actual photo would need HTTP fetch)
    doc.save();
    doc.circle(photoX + photoSize / 2, y + photoSize / 2, photoSize / 2)
      .fillColor('#e8edf2').fill();
    doc.font('Helvetica').fontSize(24).fillColor(COLORS.secondary);
    doc.text(getInitials(member.fullName), photoX, y + 18, {
      width: photoSize,
      align: 'center',
    });
    doc.restore();
  } else {
    // Default avatar circle with initials
    doc.save();
    doc.circle(photoX + photoSize / 2, y + photoSize / 2, photoSize / 2)
      .fillColor('#e8edf2').fill();
    doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.brand);
    doc.text(getInitials(member.fullName), photoX, y + 18, {
      width: photoSize,
      align: 'center',
    });
    doc.restore();
  }
  y += photoSize + 12;

  // ─── Member Name ───────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.text);
  doc.text(member.fullName, contentX, y, {
    width: contentW,
    align: 'center',
  });
  y += 22;

  // ─── Member ID ─────────────────────────────────────────
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.brandLight);
  doc.text(member.memberId, contentX, y, {
    width: contentW,
    align: 'center',
  });
  y += 18;

  // ─── Divider line ──────────────────────────────────────
  doc.save();
  doc.moveTo(contentX + 40, y).lineTo(contentX + contentW - 40, y)
    .strokeColor(COLORS.border).lineWidth(0.75).stroke();
  doc.restore();
  y += 12;

  // ─── Info fields ───────────────────────────────────────
  const fields = [
    { label: 'PLAN', value: formatPlanType(member.plan.type) },
    { label: 'START', value: formatDate(member.plan.startDate) },
    { label: 'EXPIRES', value: formatDate(member.plan.expiryDate) },
    { label: 'STATUS', value: member.status.toUpperCase() },
  ];

  // Draw as 2-column grid
  const colW = contentW / 2;
  for (let i = 0; i < fields.length; i += 2) {
    const leftField = fields[i];
    const rightField = fields[i + 1];

    // Left
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.secondary);
    doc.text(leftField.label, contentX, y, { width: colW });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text);
    doc.text(leftField.value, contentX, y + 10, { width: colW });

    // Right
    if (rightField) {
      doc.font('Helvetica').fontSize(7).fillColor(COLORS.secondary);
      doc.text(rightField.label, contentX + colW, y, { width: colW });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text);
      doc.text(rightField.value, contentX + colW, y + 10, { width: colW });
    }

    y += 28;
  }

  // Allowed days for 3-day plan
  if (member.plan.type === '3-day' && member.plan.allowedDays) {
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.secondary);
    doc.text('ALLOWED DAYS', contentX, y, { width: contentW });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text);
    doc.text(
      member.plan.allowedDays.map(dayName).join(', '),
      contentX, y + 10, { width: contentW }
    );
    y += 28;
  }

  // ─── QR Code ───────────────────────────────────────────
  const qrSize = 110;
  const qrX = cardX + (CARD.width - qrSize) / 2;

  // QR background (white square with slight padding)
  doc.save();
  doc.rect(qrX - 6, y - 4, qrSize + 12, qrSize + 12)
    .fillColor(COLORS.white).fill();
  doc.rect(qrX - 6, y - 4, qrSize + 12, qrSize + 12)
    .strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.restore();

  // Embed QR image
  doc.image(qrBuffer, qrX, y, { width: qrSize, height: qrSize });
  y += qrSize + 8;

  // Scan instruction
  doc.font('Helvetica').fontSize(7).fillColor(COLORS.secondary);
  doc.text('Scan to check in', contentX, y, {
    width: contentW,
    align: 'center',
  });

  // ─── Footer ────────────────────────────────────────────
  const footerY = cardY + CARD.height - 24;
  doc.font('Helvetica').fontSize(6).fillColor(COLORS.secondary);
  doc.text('This card is property of GymX. If found, please return to the front desk.', 
    contentX, footerY, { width: contentW, align: 'center' });

  // ─── Cut guide (dashed border for cutting) ─────────────
  doc.save();
  doc.rect(cardX - 8, cardY - 8, CARD.width + 16, CARD.height + 16)
    .dash(4, { space: 3 })
    .strokeColor('#ccc')
    .lineWidth(0.5)
    .stroke();
  doc.restore();

  // ─── Print info below card ─────────────────────────────
  doc.font('Helvetica').fontSize(8).fillColor('#999');
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-GB')} | Cut along dashed line`,
    0, cardY + CARD.height + 20, { width: pageWidth, align: 'center' }
  );

  // Finalize
  doc.end();

  const safeName = member.fullName.replace(/[^a-zA-Z0-9]/g, '_');
  return {
    stream: doc,
    filename: `GymX_Card_${safeName}_${member.memberId}.pdf`,
  };
};

// ─── Helper functions ─────────────────────────────────────

function drawRoundedRect(doc, x, y, w, h, r) {
  doc.moveTo(x + r, y)
    .lineTo(x + w - r, y)
    .quadraticCurveTo(x + w, y, x + w, y + r)
    .lineTo(x + w, y + h - r)
    .quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    .lineTo(x + r, y + h)
    .quadraticCurveTo(x, y + h, x, y + h - r)
    .lineTo(x, y + r)
    .quadraticCurveTo(x, y, x + r, y)
    .closePath();
}

function getInitials(name) {
  return name.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

function formatPlanType(type) {
  return type === '3-day' ? '3-Day Plan' : 'Full Week';
}

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function dayName(isoDay) {
  const names = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return names[isoDay] || '?';
}

module.exports = { generateCardPDF };
