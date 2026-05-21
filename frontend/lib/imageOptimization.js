/**
 * Image Optimization Utilities — client-side image compression and initials avatar generation.
 */

/**
 * Compresses an image file client-side using the Canvas API.
 * Resizes the image to fit within maxWidthPx and converts it to a JPEG blob with target quality.
 *
 * @param {File} file - The original image file.
 * @param {number} maxWidthPx - The maximum width in pixels.
 * @param {number} qualityPercent - The JPEG compression quality (0-100).
 * @returns {Promise<Blob>} The compressed image Blob.
 */
export async function compressImage(file, maxWidthPx = 200, qualityPercent = 75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let width = img.width;
        let height = img.height;

        if (width > maxWidthPx) {
          height = Math.round((height * maxWidthPx) / width);
          width = maxWidthPx;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to blob conversion failed'));
            }
          },
          'image/jpeg',
          qualityPercent / 100
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Generates an initials avatar as an SVG data URL.
 * Cycles through a palette based on a hash of the name if no color is specified.
 *
 * @param {string} name - The user's full name.
 * @param {string} [defaultColor] - Optional explicit background hex color.
 * @returns {string} The SVG data URL.
 */
export function generateInitialsAvatar(name = '', defaultColor) {
  const initials = name
    ? name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  const colors = [
    '#1A5C3A', // GymX Forest Green
    '#2E7D32', // Emerald
    '#00796B', // Teal
    '#0097A7', // Cyan
    '#1565C0', // Blue
    '#37474F', // Dark Slate
    '#6A1B9A', // Purple
    '#AD1457', // Rose
  ];

  let color = defaultColor;
  if (!color) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    color = colors[index];
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" fill="${color}"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="38" fill="#FFFFFF">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
