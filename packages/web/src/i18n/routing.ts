import { defineRouting } from 'next-intl/routing';

// ADR-0008: English keeps its existing unprefixed URLs (as-needed), only
// French gets a /fr/... prefix. No auto-detect — a visitor reaches French
// only via an explicit /fr URL or the header switcher.
export const routing = defineRouting({
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  localeDetection: false,
  // Every page already sets its own reciprocal alternates.languages (see
  // languageAlternates() in ./metadata.ts) via generateMetadata, including
  // /search's ADR-0007 case where its default-city view canonicalizes to
  // /[city]/stays rather than to itself. next-intl's own automatic `Link`
  // response header can't know about that override — it always advertises
  // the current pathname as its own hreflang self-reference, which
  // contradicts a page-level canonical that intentionally points elsewhere.
  alternateLinks: false,
});
