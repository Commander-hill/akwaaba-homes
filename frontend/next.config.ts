import type { NextConfig } from "next";

// Trigger router reload for newly added design-system routes
const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.189.163',
    'localhost',
    '127.0.0.1'
  ],
  compress: true,
  poweredByHeader: false,
  reactStrictMode: false, // Prevents duplicate renders/network calls in dev mode
  experimental: {
    cpus: 2,
    optimizePackageImports: ['lucide-react', 'date-fns', 'framer-motion', 'recharts', 'clsx'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [65, 75],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
