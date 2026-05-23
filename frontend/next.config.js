/** @type {import('next').NextConfig} */
let nextConfig = {
  reactStrictMode: false,
  distDir: process.env.VERCEL ? '.next' : '.next_fresh',
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [320, 480, 640, 750, 1080],
    imageSizes: [16, 32, 48, 64, 96],
    minimumCacheTTL: 86400, // 1 day
  },
  
  // Compression
  compress: true,

  experimental: {
    // Next.js 14.2.x auto-applies optimizePackageImports for lucide-react
    // and recharts, which causes webpack module factory race conditions.
    // Override with empty array to disable ALL automatic optimizations.
    optimizePackageImports: [],
  },

  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const backendBase = apiUrl.replace(/\/api\/v1$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${backendBase}/api/:path*`,
      },
    ];
  },

  // Headers for caching static assets
  async headers() {
    if (process.env.NODE_ENV === 'development') {
      return [];
    }
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ]
      }
    ];
  }
};

if (process.env.ANALYZE === 'true') {
  try {
    const withBundleAnalyzer = require('@next/bundle-analyzer')({
      enabled: true,
    });
    nextConfig = withBundleAnalyzer(nextConfig);
  } catch (e) {
    console.warn('Bundle analyzer not installed, skipping.');
  }
}

module.exports = nextConfig;
