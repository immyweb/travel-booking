import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

const handleI18nRouting = createMiddleware(routing);

// The booking page (packages/web/src/app/[locale]/listings/[id]/book/page.tsx)
// already redirects signed-out visitors to sign-in, but it sits under
// listings/[id]/loading.tsx, whose Suspense boundary forces that route to
// stream. Once streaming starts, Next can only signal the redirect with a
// client-side meta-refresh instead of a real 3xx (see "Behavior" in
// node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md).
// Running the same check here, before rendering starts, restores a proper
// HTTP redirect. This is a fast, optimistic cookie-presence check — the page
// still does the real session validation, matching Next's own guidance to
// never rely on Proxy alone for auth.
//
// Locale-aware: the path is matched with an optional /fr prefix (ADR-0008's
// as-needed prefixing means English has none), and the sign-in redirect
// preserves whichever prefix — if any — the incoming request had.
const BOOK_PATH_PATTERN = /^\/(fr)?\/?listings\/[^/]+\/book$/;

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const bookPathMatch = pathname.match(BOOK_PATH_PATTERN);

  if (bookPathMatch && !request.cookies.has('better-auth.session_token')) {
    const localePrefix = bookPathMatch[1] ? `/${bookPathMatch[1]}` : '';
    const redirectUrl = new URL(`${localePrefix}/sign-in`, request.url);
    redirectUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  return handleI18nRouting(request);
}

export const config = {
  // Match every pathname except api/_next/_vercel internals and files with
  // an extension (e.g. favicon.ico) — next-intl's own recommended matcher,
  // since this proxy now also owns locale routing for every app route.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
