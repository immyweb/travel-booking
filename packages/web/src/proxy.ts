import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// The booking page (packages/web/src/app/listings/[id]/book/page.tsx) already
// redirects signed-out visitors to sign-in, but it sits under
// listings/[id]/loading.tsx, whose Suspense boundary forces that route to
// stream. Once streaming starts, Next can only signal the redirect with a
// client-side meta-refresh instead of a real 3xx (see "Behavior" in
// node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md).
// Running the same check here, before rendering starts, restores a proper
// HTTP redirect. This is a fast, optimistic cookie-presence check — the page
// still does the real session validation, matching Next's own guidance to
// never rely on Proxy alone for auth.
export function proxy(request: NextRequest) {
  if (request.cookies.has('better-auth.session_token')) {
    return NextResponse.next();
  }

  const redirectUrl = new URL('/sign-in', request.url);
  redirectUrl.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: '/listings/:id/book',
};
