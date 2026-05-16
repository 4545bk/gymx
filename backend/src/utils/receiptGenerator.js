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

// ─── Draw Header ─────────────────────────────────────────
function drawHeader(doc, x, y) {
  // Brand bar
  doc.rect(x, y, RECEIPT_W, 50).fill(C.brand);
  doc.font('Helvetica-Bold').fontSize(20).fillColor('white');
  doc.text('GymX', x, y + 12, { width: RECEIPT_W, align: 'center' });
  doc.font('Helvetica').fontSize(7).fillColor('#8ab4d8');
  doc.text('GYM MANAGEMENT SYSTEM', x, y + 34, { width: RECEIPT_W, align: 'center' });
  return y + 50;
}

// ─── Draw Footer ─────────────────────────────────────────
function drawFooter(doc, x, y) {
  doc.font('Helvetica').fontSize(7).fillColor(C.secondary);
  doc.text('Thank you for choosing GymX!', x + MARGIN, y, { width: COL_W, align: 'center' });
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
  y = drawHeader(doc, x, y - 10);
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
  drawFooter(doc, x, y);

  doc.end();
  return { stream: doc, filename: `GymX_Receipt_${receiptNumber}.pdf`, receiptNumber };
}

// ═════════════════════════════════════════════════════════
// PRODUCT SALE RECEIPT
// ═════════════════════════════════════════════════════════
async function generateSaleReceipt(sale) {
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
  y = drawHeader(doc, x, y);
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
  drawFooter(doc, x, y);

  doc.end();
  return { stream: doc, filename: `GymX_Receipt_${sale.saleNumber}.pdf` };
}

module.exports = { generatePaymentReceipt, generateSaleReceipt, generateReceiptNumber };
