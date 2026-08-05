import {
  BookingSchema,
  CitiesResponseSchema,
  CreateBookingResponseSchema,
  ListingDetailSchema,
  SearchResponseSchema,
  SessionUserSchema,
  toSearchParams,
  type AuthActionResult,
  type Booking,
  type CityCentroid,
  type ClientCreateBooking,
  type CreateBookingResult,
  type ListingDetail,
  type SearchQuery,
  type SearchResponse,
  type SessionUser,
} from '@travel-booking/core';
import { z } from 'zod';
import { currentCookieHeader, forwardSetCookies } from '@/lib/cookies';
import { betterAuthErrorMessageFrom, errorMessageFrom, failed } from '@/lib/errors';

// Internal Next.js -> Express connection (ADR-0002): Express stays the
// single source of truth for data access, so SSR pages fetch over HTTP
// rather than reading the database directly.
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

// This app's own origin. Better Auth's endpoints reject any cookie-bearing
// request whose Origin doesn't match its trustedOrigins (see api/src/auth/auth.ts)
// — real browser requests never reach Better Auth directly (it's mounted in
// Express, not Next), so every server-to-server call here sets this
// explicitly rather than relying on a browser to supply it.
const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3000';

// Shared by /search and /[city]/stays, which both call fetchSearchResults
// with these as their default, no-location-control view — a single source
// keeps the two from drifting to different defaults.
export const DEFAULT_RADIUS_KM = 25;
export const PAGE_SIZE = 12;

// /search calls this uncached (live results per request); /[city]/stays
// passes its own `revalidate` so this same fetch instead participates in
// that route's ISR — a `cache: 'no-store'` fetch anywhere in a route's render
// tree forces the whole route dynamic, which would defeat the pre-rendering
// /[city]/stays exists for (ADR-0007).
export async function fetchSearchResults(
  query: SearchQuery,
  options?: { revalidate: number },
): Promise<SearchResponse> {
  const response = await fetch(
    `${API_URL}/search?${toSearchParams(query).toString()}`,
    options ? { next: { revalidate: options.revalidate } } : { cache: 'no-store' },
  );
  if (!response.ok) {
    await failed('GET /search', response);
  }

  // Parsed, not cast: a contract drift fails here at the seam rather than
  // surfacing as an undefined halfway through rendering a page.
  return SearchResponseSchema.parse(await response.json());
}

export async function fetchCities(): Promise<CityCentroid[]> {
  // Reference data that changes rarely — revalidate on an interval instead
  // of refetching on every request like the live search results.
  const response = await fetch(`${API_URL}/search/cities`, { next: { revalidate: 300 } });
  if (!response.ok) {
    await failed('GET /search/cities', response);
  }

  return CitiesResponseSchema.parse(await response.json()).cities;
}

// A malformed id and an unknown-but-well-formed one both need to render the
// same not-found page rather than leaking the 400/404 distinction the api
// makes between them (same reasoning as fetchBooking below) — a bad or stale
// listing link, or a garbled date in the URL, is an expected outcome here,
// not a failure. Any other non-2xx still surfaces as a thrown error like the
// other fetchers.
export async function fetchListing(
  id: string,
  dates?: { checkIn: string; checkOut: string },
): Promise<ListingDetail | null> {
  const query = dates ? `?${new URLSearchParams(dates).toString()}` : '';
  const response = await fetch(`${API_URL}/listings/${id}${query}`, { cache: 'no-store' });
  if (response.status === 404 || response.status === 400) {
    return null;
  }
  if (!response.ok) {
    await failed('GET /listings/:id', response);
  }

  return ListingDetailSchema.parse(await response.json());
}

// 401, 409 and 400 are all expected outcomes the booking form re-renders
// around rather than failures: 401 means the session cookie is missing/
// expired (userId is derived from it server-side — never client-supplied,
// see CreateBookingSchema); 409 means the #16 EXCLUDE constraint rejected
// overlapping dates; 400 means server-side validation (e.g. guests over the
// listing's maxGuests) caught something the client-side check missed. Any
// other non-2xx is unexpected and still surfaces as a thrown error, like the
// other fetchers.
export async function createBooking(input: ClientCreateBooking): Promise<CreateBookingResult> {
  const response = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: await currentCookieHeader() },
    body: JSON.stringify(input),
    cache: 'no-store',
  });

  if (response.status === 401) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'Please sign in to complete your booking.',
    };
  }
  if (response.status === 409) {
    return { ok: false, reason: 'conflict' };
  }
  if (response.status === 400) {
    return {
      ok: false,
      reason: 'invalid',
      message: await errorMessageFrom(response, 'Invalid booking details'),
    };
  }
  if (!response.ok) {
    await failed('POST /bookings', response);
  }

  const { booking, clientSecret } = CreateBookingResponseSchema.parse(await response.json());
  return { ok: true, booking, clientSecret };
}

// A booking confirmation link has no auth/ownership check (email is the only
// record — see #19), so a malformed id and an unknown-but-well-formed one
// both need to render the same not-found page rather than leaking the 400/404
// distinction the api makes between them.
export async function fetchBooking(id: string): Promise<Booking | null> {
  const response = await fetch(`${API_URL}/bookings/${id}`, { cache: 'no-store' });
  if (response.status === 404 || response.status === 400) {
    return null;
  }
  if (!response.ok) {
    await failed('GET /bookings/:id', response);
  }

  return BookingSchema.parse(await response.json());
}

// Callers gate on fetchSession() first (see app/my-bookings/page.tsx, same
// pattern as the booking page), so a 401 here would only mean the session
// expired between that check and this call — rare enough not to need its own
// handling, unlike createBooking's 401, which a stale form submission hits
// far more plausibly.
export async function fetchMyBookings(): Promise<Booking[]> {
  const response = await fetch(`${API_URL}/bookings/mine`, {
    headers: { Cookie: await currentCookieHeader() },
    cache: 'no-store',
  });
  if (!response.ok) {
    await failed('GET /bookings/mine', response);
  }

  return z.array(BookingSchema).parse(await response.json());
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const response = await fetch(`${API_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: SITE_URL },
    body: JSON.stringify(input),
    cache: 'no-store',
  });

  if (!response.ok) {
    return {
      ok: false,
      message: await betterAuthErrorMessageFrom(response, 'Could not create your account.'),
    };
  }

  await forwardSetCookies(response);
  return { ok: true };
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const response = await fetch(`${API_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: SITE_URL },
    body: JSON.stringify(input),
    cache: 'no-store',
  });

  if (!response.ok) {
    return {
      ok: false,
      message: await betterAuthErrorMessageFrom(response, 'Invalid email or password.'),
    };
  }

  await forwardSetCookies(response);
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/sign-out`, {
    method: 'POST',
    headers: { Cookie: await currentCookieHeader(), Origin: SITE_URL },
    cache: 'no-store',
  });

  if (response.ok) {
    await forwardSetCookies(response);
  }
}

// Next's own fetch doesn't attach the browser's cookies to a server-issued
// request the way a browser-issued one would, so the incoming request's
// Cookie header is read and forwarded explicitly here.
export async function fetchSession(): Promise<SessionUser | null> {
  const response = await fetch(`${API_URL}/api/auth/get-session`, {
    headers: { Cookie: await currentCookieHeader(), Origin: SITE_URL },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `GET /api/auth/get-session failed with status ${response.status}: ${await betterAuthErrorMessageFrom(response, response.statusText)}`,
    );
  }

  const body: unknown = await response.json();
  if (!body) {
    return null;
  }

  return SessionUserSchema.parse((body as { user: unknown }).user);
}
