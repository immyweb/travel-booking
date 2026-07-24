import type { CityCentroid, SearchQuery, SearchResponse } from '@travel-booking/core';

// Internal Next.js -> Express connection (ADR-0002): Express stays the
// single source of truth for data access, so SSR pages fetch over HTTP
// rather than reading the database directly.
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function fetchSearchResults(query: SearchQuery): Promise<SearchResponse> {
  const params = new URLSearchParams({
    lat: String(query.lat),
    lng: String(query.lng),
    radiusKm: String(query.radiusKm),
    page: String(query.page),
    size: String(query.size),
  });
  if (query.country) {
    params.set('country', query.country);
  }

  const response = await fetch(`${API_URL}/search?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`GET /search failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchCities(): Promise<CityCentroid[]> {
  const response = await fetch(`${API_URL}/search/cities`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`GET /search/cities failed with status ${response.status}`);
  }

  const data: { cities: CityCentroid[] } = await response.json();
  return data.cities;
}
