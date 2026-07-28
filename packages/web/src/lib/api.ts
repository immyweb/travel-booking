import {
  BookingSchema,
  CitiesResponseSchema,
  ErrorResponseSchema,
  ListingDetailSchema,
  SearchResponseSchema,
  toSearchParams,
  type Booking,
  type CityCentroid,
  type CreateBooking,
  type ListingDetail,
  type SearchQuery,
  type SearchResponse,
} from '@travel-booking/core';

// Internal Next.js -> Express connection (ADR-0002): Express stays the
// single source of truth for data access, so SSR pages fetch over HTTP
// rather than reading the database directly.
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

// The api replies with one error envelope for every non-2xx (see
// api/src/http/errors.ts). safeParse, because an error from a proxy or load
// balancer won't be in our envelope. Shared by `failed()` (which throws) and
// any caller that needs the message without throwing, like createBooking's
// 400 branch.
async function errorMessageFrom(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = ErrorResponseSchema.safeParse(body);
  return parsed.success ? parsed.data.error.message : fallback;
}

async function failed(route: string, response: Response): Promise<never> {
  const detail = await errorMessageFrom(response, response.statusText);
  throw new Error(`${route} failed with status ${response.status}: ${detail}`);
}

export async function fetchSearchResults(query: SearchQuery): Promise<SearchResponse> {
  const response = await fetch(`${API_URL}/search?${toSearchParams(query).toString()}`, {
    cache: 'no-store',
  });
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

export type CreateBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: 'conflict' }
  | { ok: false; reason: 'invalid'; message: string };

// 409 and 400 are both expected outcomes the booking form re-renders around
// rather than failures: 409 means the #16 EXCLUDE constraint rejected
// overlapping dates; 400 means server-side validation (e.g. guests over the
// listing's maxGuests) caught something the client-side check missed. Any
// other non-2xx is unexpected and still surfaces as a thrown error, like the
// other fetchers.
export async function createBooking(input: CreateBooking): Promise<CreateBookingResult> {
  const response = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    cache: 'no-store',
  });

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

  return { ok: true, booking: BookingSchema.parse(await response.json()) };
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
