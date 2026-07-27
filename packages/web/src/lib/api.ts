import {
  CitiesResponseSchema,
  ErrorResponseSchema,
  SearchResponseSchema,
  toSearchParams,
  type CityCentroid,
  type SearchQuery,
  type SearchResponse,
} from '@travel-booking/core';

// Internal Next.js -> Express connection (ADR-0002): Express stays the
// single source of truth for data access, so SSR pages fetch over HTTP
// rather than reading the database directly.
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

// The api replies with one error envelope for every non-2xx (see
// api/src/http/errors.ts), so surface the message it produced instead of
// reducing the failure to a status code. safeParse, because an error from a
// proxy or load balancer won't be in our envelope.
async function failed(route: string, response: Response): Promise<never> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = ErrorResponseSchema.safeParse(body);
  const detail = parsed.success ? parsed.data.error.message : response.statusText;

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
