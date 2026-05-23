/**
 * Receipt Generator — Shared PDF receipt templates.
 *
 * Two receipt types:
 *   1. Membership payment receipts (from Payment model)
 *   2. Product sale receipts (from Sale model)
 *
 * Design:
 *   - Uses pdfkit (already installed for membership cards)
 *   - Compact receipt layout (fits on half A4 or thermal printer)
 *   - QR code encodes receipt number for verification
 *   - Monochrome-friendly for low-cost printing
 *   - Generated on-demand from immutable records (no storage)
 */
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const https = require('https');
const http = require('http');
const Settings = require('../models/Settings');

// ─── Receipt dimensions ──────────────────────────────────
const PAGE_WIDTH = 595.28;   // A4 width (points)
const RECEIPT_W = 380;
const MARGIN = 30;
const COL_W = RECEIPT_W - MARGIN * 2;

// ─── Colors ──────────────────────────────────────────────
const C = {
  brand: '#1a3c5e',
  text: '#1c2833',
  secondary: '#5d6d7e',
  border: '#d5d8dc',
  accent: '#2563eb',
};

// ─── Helpers ─────────────────────────────────────────────
function formatPrice(cents) {
  return `${(cents / 100).toFixed(2)} ETB`;
}

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatDateTime(date) {
  if (!date) return '—';
  const d = new Date(date);
  return `${formatDate(d)} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

function generateReceiptNumber(paymentId, recordedAt) {
  const d = new Date(recordedAt);
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = paymentId.toString().slice(-4).toUpperCase();
  return `RCP-${dateStr}-${suffix}`;
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

// ─── Draw Header ─────────────────────────────────────────
function drawHeader(doc, x, y, logoBuffer, settings = {}) {
  // Brand bar
  doc.rect(x, y, RECEIPT_W, 50).fill(C.brand);
  
  const gymName = settings.gymName || 'GymX';
  const tagline = settings.tagline || 'GYM MANAGEMENT SYSTEM';

  if (logoBuffer) {
    const logoSize = 30;
    const logoX = x + MARGIN;
    const logoY = y + (50 - logoSize) / 2; // vertically centered
    
    try {
      doc.image(logoBuffer, logoX, logoY, { width: logoSize, height: logoSize });
      const textStartX = logoX + logoSize + 10;
      const textW = RECEIPT_W - (MARGIN * 2) - logoSize - 10;
      
      doc.font('Helvetica-Bold').fontSize(18).fillColor('white');
      doc.text(gymName, textStartX, y + 12, { width: textW });
      
      doc.font('Helvetica').fontSize(7).fillColor('#8ab4d8');
      doc.text(tagline.toUpperCase(), textStartX, y + 32, { width: textW });
    } catch (e) {
      console.error('[RECEIPT] Logo embed failed:', e.message);
      drawCenteredHeader(doc, x, y, gymName, tagline);
    }
  } else {
    drawCenteredHeader(doc, x, y, gymName, tagline);
  }
  return y + 50;
}

function drawCenteredHeader(doc, x, y, gymName, tagline) {
  doc.font('Helvetica-Bold').fontSize(20).fillColor('white');
  doc.text(gymName, x, y + 12, { width: RECEIPT_W, align: 'center' });
  doc.font('Helvetica').fontSize(7).fillColor('#8ab4d8');
  doc.text(tagline.toUpperCase(), x, y + 34, { width: RECEIPT_W, align: 'center' });
}

// ─── Draw Footer ─────────────────────────────────────────
function drawFooter(doc, x, y, settings = {}) {
  const footerText = settings.receiptFooter || 'Thank you for choosing GymX!';
  doc.font('Helvetica').fontSize(7).fillColor(C.secondary);
  doc.text(footerText, x + MARGIN, y, { width: COL_W, align: 'center' });
  y += 12;
  doc.text('This is a computer-generated receipt. No signature required.', x + MARGIN, y, { width: COL_W, align: 'center' });
  return y + 12;
}

// ─── Draw Divider ────────────────────────────────────────
function drawDivider(doc, x, y, dashed = false) {
  doc.save();
  if (dashed) doc.dash(3, { space: 2 });
  doc.moveTo(x + MARGIN, y).lineTo(x + RECEIPT_W - MARGIN, y)
    .strokeColor(C.border).lineWidth(0.5).stroke();
  doc.restore();
  return y + 8;
}

// ─── Draw Info Row ───────────────────────────────────────
function drawInfoRow(doc, x, y, label, value) {
  doc.font('Helvetica').fontSize(8).fillColor(C.secondary);
  doc.text(label, x + MARGIN, y, { width: COL_W / 2 });
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.text);
  doc.text(value, x + MARGIN + COL_W / 2, y, { width: COL_W / 2, align: 'right' });
  return y + 14;
}

// ═════════════════════════════════════════════════════════
// MEMBERSHIP PAYMENT RECEIPT
// ═════════════════════════════════════════════════════════
async function generatePaymentReceipt(payment) {
  const receiptNumber = generateReceiptNumber(payment._id, payment.recordedAt);

  // Fetch settings and logo
  const settings = await Settings.findOne({ gymId: 'default' }).lean() || {};
  let logoBuffer = null;
  if (settings.logoUrl) {
    logoBuffer = await fetchImageBuffer(settings.logoUrl);
  }

  const qrBuffer = await QRCode.toBuffer(receiptNumber, {
    type: 'png', width: 200, margin: 1,
    color: { dark: C.brand, light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });

  const doc = new PDFDocument({ size: 'A4', margin: 0, info: {
    Title: `Receipt ${receiptNumber}`,
    Author: 'GymX Gym Management System',
  }});

  const x = (PAGE_WIDTH - RECEIPT_W) / 2;
  let y = 80;

  // Border
  doc.rect(x, y - 10, RECEIPT_W, 500).strokeColor(C.border).lineWidth(0.5).stroke();

  // Header
  y = drawHeader(doc, x, y - 10, logoBuffer, settings);
  y += 15;

  // Receipt title
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.text);
  doc.text('PAYMENT RECEIPT', x + MARGIN, y, { width: COL_W, align: 'center' });
  y += 18;
  doc.font('Helvetica').fontSize(9).fillColor(C.accent);
  doc.text(receiptNumber, x + MARGIN, y, { width: COL_W, align: 'center' });
  y += 18;

  y = drawDivider(doc, x, y);

  // Payment details
  y = drawInfoRow(doc, x, y, 'Date', formatDateTime(payment.recordedAt));
  y = drawInfoRow(doc, x, y, 'Payment Method', (payment.paymentMethod || 'cash').replace('-', ' '));

  if (payment.direction === 'in' && payment.memberName) {
    y = drawInfoRow(doc, x, y, 'Member', payment.memberName);
  }
  if (payment.planType) {
    y = drawInfoRow(doc, x, y, 'Plan', payment.planType === '3-day' ? '3-Day Plan' : 'Full Week');
  }
  y = drawInfoRow(doc, x, y, 'Type', (payment.type || '').replace('-', ' '));
  y = drawInfoRow(doc, x, y, 'Direction', payment.direction === 'in' ? 'Income' : 'Expense');

  if (payment.description) {
    y += 4;
    doc.font('Helvetica').fontSize(7).fillColor(C.secondary);
    doc.text('Description:', x + MARGIN, y);
    y += 10;
    doc.font('Helvetica').fontSize(8).fillColor(C.text);
    doc.text(payment.description, x + MARGIN, y, { width: COL_W });
    y += 16;
  }

  y = drawDivider(doc, x, y);

  // Amount (big)
  doc.font('Helvetica').fontSize(9).fillColor(C.secondary);
  doc.text('AMOUNT', x + MARGIN, y, { width: COL_W, align: 'center' });
  y += 14;
  doc.font('Helvetica-Bold').fontSize(22).fillColor(C.brand);
  doc.text(formatPrice(payment.amount), x + MARGIN, y, { width: COL_W, align: 'center' });
  y += 30;

  y = drawDivider(doc, x, y);

  // Period
  if (payment.period) {
    y = drawInfoRow(doc, x, y, 'Period', `${payment.period.month}/${payment.period.year}`);
  }

  // Recorded by
  if (payment.recordedByName) {
    y = drawInfoRow(doc, x, y, 'Recorded By', payment.recordedByName);
  }

  y += 4;

  // QR Code
  const qrSize = 60;
  const qrX = x + (RECEIPT_W - qrSize) / 2;
  doc.image(qrBuffer, qrX, y, { width: qrSize, height: qrSize });
  y += qrSize + 6;
  doc.font('Helvetica').fontSize(6).fillColor(C.secondary);
  doc.text('Scan to verify', x + MARGIN, y, { width: COL_W, align: 'center' });
  y += 14;

  y = drawDivider(doc, x, y, true);
  drawFooter(doc, x, y, settings);

  doc.end();
  return { stream: doc, filename: `GymX_Receipt_${receiptNumber}.pdf`, receiptNumber };
}

// ═════════════════════════════════════════════════════════
// PRODUCT SALE RECEIPT
// ═════════════════════════════════════════════════════════
async function generateSaleReceipt(sale) {
  // Fetch settings and logo
  const settings = await Settings.findOne({ gymId: 'default' }).lean() || {};
  let logoBuffer = null;
  if (settings.logoUrl) {
    logoBuffer = await fetchImageBuffer(settings.logoUrl);
  }

  const qrBuffer = await QRCode.toBuffer(sale.saleNumber, {
    type: 'png', width: 200, margin: 1,
    color: { dark: C.brand, light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });

  const doc = new PDFDocument({ size: 'A4', margin: 0, info: {
    Title: `Sale Receipt ${sale.saleNumber}`,
    Author: 'GymX Gym Management System',
  }});

  const x = (PAGE_WIDTH - RECEIPT_W) / 2;
  let y = 60;

  // Header
  y = drawHeader(doc, x, y, logoBuffer, settings);
  y += 15;

  // Receipt title
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.text);
  doc.text('SALE RECEIPT', x + MARGIN, y, { width: COL_W, align: 'center' });
  y += 18;
  doc.font('Helvetica').fontSize(9).fillColor(C.accent);
  doc.text(sale.saleNumber, x + MARGIN, y, { width: COL_W, align: 'center' });
  y += 18;

  y = drawDivider(doc, x, y);

  // Sale info
  y = drawInfoRow(doc, x, y, 'Date', formatDateTime(sale.saleDate));
  y = drawInfoRow(doc, x, y, 'Cashier', sale.soldByName);
  y = drawInfoRow(doc, x, y, 'Payment', (sale.paymentMethod || 'cash').replace('-', ' '));

  y = drawDivider(doc, x, y);

  // Items table header
  doc.font('Helvetica-Bold').fontSize(7).fillColor(C.secondary);
  doc.text('ITEM', x + MARGIN, y, { width: COL_W * 0.45 });
  doc.text('QTY', x + MARGIN + COL_W * 0.45, y, { width: COL_W * 0.15, align: 'center' });
  doc.text('PRICE', x + MARGIN + COL_W * 0.6, y, { width: COL_W * 0.2, align: 'right' });
  doc.text('TOTAL', x + MARGIN + COL_W * 0.8, y, { width: COL_W * 0.2, align: 'right' });
  y += 14;

  y = drawDivider(doc, x, y);

  // Items
  for (const item of (sale.items || [])) {
    doc.font('Helvetica').fontSize(8).fillColor(C.text);
    doc.text(item.productName, x + MARGIN, y, { width: COL_W * 0.45 });
    doc.text(String(item.quantity), x + MARGIN + COL_W * 0.45, y, { width: COL_W * 0.15, align: 'center' });
    doc.text(formatPrice(item.unitPrice), x + MARGIN + COL_W * 0.6, y, { width: COL_W * 0.2, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(8);
    doc.text(formatPrice(item.lineTotal), x + MARGIN + COL_W * 0.8, y, { width: COL_W * 0.2, align: 'right' });
    y += 14;
  }

  y = drawDivider(doc, x, y);

  // Subtotal
  y = drawInfoRow(doc, x, y, 'Subtotal', formatPrice(sale.subtotal));
  if (sale.discount > 0) {
    y = drawInfoRow(doc, x, y, 'Discount', `- ${formatPrice(sale.discount)}`);
  }

  y = drawDivider(doc, x, y);

  // Total (big)
  doc.font('Helvetica').fontSize(9).fillColor(C.secondary);
  doc.text('TOTAL', x + MARGIN, y, { width: COL_W, align: 'center' });
  y += 14;
  doc.font('Helvetica-Bold').fontSize(22).fillColor(C.brand);
  doc.text(formatPrice(sale.total), x + MARGIN, y, { width: COL_W, align: 'center' });
  y += 30;

  if (sale.notes) {
    doc.font('Helvetica').fontSize(7).fillColor(C.secondary);
    doc.text(`Note: ${sale.notes}`, x + MARGIN, y, { width: COL_W, align: 'center' });
    y += 14;
  }

  // Voided stamp
  if (sale.voided) {
    doc.save();
    doc.rotate(-30, { origin: [PAGE_WIDTH / 2, y - 60] });
    doc.font('Helvetica-Bold').fontSize(40).fillColor('rgba(239, 68, 68, 0.3)');
    doc.text('VOIDED', x, y - 80, { width: RECEIPT_W, align: 'center' });
    doc.restore();
  }

  // QR Code
  const qrSize = 60;
  const qrX = x + (RECEIPT_W - qrSize) / 2;
  doc.image(qrBuffer, qrX, y, { width: qrSize, height: qrSize });
  y += qrSize + 6;
  doc.font('Helvetica').fontSize(6).fillColor(C.secondary);
  doc.text('Scan to verify', x + MARGIN, y, { width: COL_W, align: 'center' });
  y += 14;

  y = drawDivider(doc, x, y, true);
  drawFooter(doc, x, y, settings);

  doc.end();
  return { stream: doc, filename: `GymX_Receipt_${sale.saleNumber}.pdf` };
}

module.exports = { generatePaymentReceipt, generateSaleReceipt, generateReceiptNumber };
