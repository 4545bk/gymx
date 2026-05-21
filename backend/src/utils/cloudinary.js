/**
 * Cloudinary Utility — Image upload helper for GymX.
 *
 * Handles:
 *   - Base64 data URI uploads (logo, member photos)
 *   - Automatic optimization and resizing
 *   - Organized folder structure (gymx/logos, gymx/members)
 */
const cloudinary = require('cloudinary').v2;

// Configure from env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a base64 data URI to Cloudinary.
 * @param {string} base64DataUri - e.g. "data:image/png;base64,iVBOR..."
 * @param {object} options
 * @param {string} options.folder - Cloudinary folder (e.g. "gymx/logos")
 * @param {string} options.publicId - Custom public ID (optional)
 * @param {number} options.width - Max width for resize (optional)
 * @param {number} options.height - Max height for resize (optional)
 * @returns {Promise<string>} The secure URL of the uploaded image
 */
const uploadImage = async (base64DataUri, options = {}) => {
  if (!base64DataUri) return null;

  // If it's already a Cloudinary URL, return as-is
  if (typeof base64DataUri === 'string' && base64DataUri.includes('res.cloudinary.com')) {
    return base64DataUri;
  }

  // Must be a base64 data URI
  if (!base64DataUri.startsWith('data:image/')) {
    console.warn('[CLOUDINARY] Skipping non-image data:', base64DataUri.substring(0, 40));
    return null;
  }

  try {
    const uploadOptions = {
      folder: options.folder || 'gymx',
      resource_type: 'image',
      overwrite: true,
      format: 'webp', // Auto-convert to WebP for smaller size
      quality: 'auto:good',
    };

    if (options.publicId) {
      uploadOptions.public_id = options.publicId;
    }

    if (options.width || options.height) {
      uploadOptions.transformation = [{
        width: options.width || undefined,
        height: options.height || undefined,
        crop: 'fill',
        gravity: 'auto',
      }];
    }

    const result = await cloudinary.uploader.upload(base64DataUri, uploadOptions);
    console.log('[CLOUDINARY] Uploaded:', result.secure_url, `(${Math.round(result.bytes / 1024)}KB)`);
    return result.secure_url;
  } catch (err) {
    console.error('[CLOUDINARY] Upload failed:', err.message);
    // Return the original base64 as fallback so nothing breaks
    return base64DataUri;
  }
};

/**
 * Delete an image from Cloudinary by URL.
 * @param {string} imageUrl - The Cloudinary secure URL
 */
const deleteImage = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('res.cloudinary.com')) return;

  try {
    // Extract public_id from URL
    const parts = imageUrl.split('/upload/');
    if (parts.length < 2) return;
    const pathPart = parts[1];
    // Remove version prefix (v1234567890/) and file extension
    const publicId = pathPart
      .replace(/^v\d+\//, '')
      .replace(/\.[^.]+$/, '');
    await cloudinary.uploader.destroy(publicId);
    console.log('[CLOUDINARY] Deleted:', publicId);
  } catch (err) {
    console.error('[CLOUDINARY] Delete failed:', err.message);
  }
};

/**
 * Check if Cloudinary is configured.
 */
const isConfigured = () => {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
};

module.exports = { uploadImage, deleteImage, isConfigured };
