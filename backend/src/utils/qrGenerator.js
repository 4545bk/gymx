/**
 * QR Code Generator.
 * Generates PNG QR codes encoding ONLY the memberId string.
 * Returns base64 data URL for direct rendering and printing.
 */
const QRCode = require('qrcode');

/**
 * Generate QR code as base64 PNG data URL.
 * @param {string} memberId - The member ID to encode (e.g., "MBR-7F3A9C2B")
 * @returns {Promise<string>} Base64 data URL string
 */
const generateQRCode = async (memberId) => {
  try {
    const dataUrl = await QRCode.toDataURL(memberId, {
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#1A3C5E',  // Dark blue matching brand
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M', // Medium error correction
    });
    return dataUrl;
  } catch (err) {
    console.error('QR code generation failed:', err.message);
    throw new Error('Failed to generate QR code');
  }
};

module.exports = { generateQRCode };
