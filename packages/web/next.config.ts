import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.travel-booking.example' },
      // Real, stable stock photos for seeded (dev) listing data — see
      // packages/api/scripts/seed.ts.
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
  experimental: {
    optimizePackageImports: ['radix-ui'],
  },
};

export default nextConfig;
