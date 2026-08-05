import { defineRouting } from 'next-intl/routing';

// ADR-0008: English keeps its existing unprefixed URLs (as-needed), only
// French gets a /fr/... prefix. No auto-detect — a visitor reaches French
// only via an explicit /fr URL or the header switcher.
export const routing = defineRouting({
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  localeDetection: false,
});
