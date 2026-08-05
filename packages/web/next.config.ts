import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

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
    // The root layout lives under app/[locale] (ADR-0008), so there's no
    // single layout.js Next.js can compose a 404 from for a request that
    // resolves to no locale at all — see global-not-found.md's second
    // bullet. app/global-not-found.tsx covers that case.
    globalNotFound: true,
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
