import { getPathname } from './navigation';
import { routing } from './routing';

type Href = string | { pathname: string; query?: Record<string, string | string[]> };

// Shared by every page's generateMetadata (existing or static) so each one
// sets reciprocal hreflang alternates between the en/fr versions of that
// same page (#38), the same way #37's canonical URLs are already set —
// `href` is the unprefixed, locale-agnostic pathname (e.g. `/listings/abc`),
// optionally with a query (e.g. Search's own filter state), matching what
// next-intl's own Link/getPathname expect everywhere else.
export function languageAlternates(href: Href): Record<string, string> {
  return Object.fromEntries(
    routing.locales.map((locale) => [locale, getPathname({ href, locale })]),
  );
}
