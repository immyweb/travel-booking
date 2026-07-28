import type { CitiesResponse, ListingDetail, SearchResponse } from '@travel-booking/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCities, fetchListing, fetchSearchResults } from '@/lib/api';

const fetchMock = vi.fn();

// Only the four members lib/api.ts actually reads, so the stub can't drift into
// asserting things about undici's Response that we don't depend on.
function stubResponse(
  body: unknown,
  init: { status?: number; statusText?: string; unparseable?: boolean } = {},
) {
  const status = init.status ?? 200;

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: init.statusText ?? '',
    json: async () => {
      if (init.unparseable) {
        throw new Error('not json');
      }
      return body;
    },
  } as unknown as Response;
}

const CITIES: CitiesResponse = {
  cities: [
    { city: 'Lisbon', country: 'Portugal', coordinates: { latitude: 38.7169, longitude: -9.1399 } },
  ],
};

const SEARCH: SearchResponse = {
  pagination: { page: 1, size: 12, total: 1, totalPages: 1 },
  results: [
    {
      id: 'listing-1',
      title: 'Sunny Alfama studio',
      images: ['https://images.travel-booking.example/1.jpg'],
      price: 82,
      currency: 'EUR',
      coordinates: { latitude: 38.7127, longitude: -9.1288 },
      distanceKm: 1.2,
    },
  ],
};

const QUERY = { lat: 38.7169, lng: -9.1399, radiusKm: 25, page: 1, size: 12 };

function requestedUrl(): URL {
  const call = fetchMock.mock.calls[0];
  if (!call) {
    throw new Error('fetch was never called');
  }

  return new URL(String(call[0]));
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('fetchCities', () => {
  it('returns the parsed cities', async () => {
    fetchMock.mockResolvedValue(stubResponse(CITIES));

    await expect(fetchCities()).resolves.toEqual(CITIES.cities);
  });

  it('rejects a payload that does not match the contract', async () => {
    // Previously cast rather than parsed, so this shape reached the page and
    // failed later as an undefined during render.
    fetchMock.mockResolvedValue(stubResponse({ cities: [{ city: 'Lisbon' }] }));

    await expect(fetchCities()).rejects.toThrow();
  });

  it('surfaces the message from the api error envelope', async () => {
    fetchMock.mockResolvedValue(
      stubResponse({ error: { message: 'Internal Server Error' } }, { status: 500 }),
    );

    await expect(fetchCities()).rejects.toThrow(
      'GET /search/cities failed with status 500: Internal Server Error',
    );
  });

  it('falls back to statusText when the body is not our envelope', async () => {
    fetchMock.mockResolvedValue(
      stubResponse(null, { status: 502, statusText: 'Bad Gateway', unparseable: true }),
    );

    await expect(fetchCities()).rejects.toThrow(
      'GET /search/cities failed with status 502: Bad Gateway',
    );
  });
});

describe('fetchSearchResults', () => {
  it('returns the parsed search response', async () => {
    fetchMock.mockResolvedValue(stubResponse(SEARCH));

    await expect(fetchSearchResults(QUERY)).resolves.toEqual(SEARCH);
  });

  it('serialises every query field it was given', async () => {
    fetchMock.mockResolvedValue(stubResponse(SEARCH));

    await fetchSearchResults({ ...QUERY, country: 'Portugal' });

    expect(Object.fromEntries(requestedUrl().searchParams)).toEqual({
      lat: '38.7169',
      lng: '-9.1399',
      radiusKm: '25',
      page: '1',
      size: '12',
      country: 'Portugal',
    });
  });

  it('omits an absent optional filter rather than sending undefined', async () => {
    fetchMock.mockResolvedValue(stubResponse(SEARCH));

    await fetchSearchResults(QUERY);

    expect(requestedUrl().searchParams.has('country')).toBe(false);
  });

  it('rejects a payload that does not match the contract', async () => {
    fetchMock.mockResolvedValue(stubResponse({ pagination: SEARCH.pagination }));

    await expect(fetchSearchResults(QUERY)).rejects.toThrow();
  });
});

const LISTING: ListingDetail = {
  id: 'listing-1',
  title: 'Sunny Alfama studio',
  images: ['https://images.travel-booking.example/1.jpg'],
  price: 82,
  currency: 'EUR',
  maxGuests: 4,
  amenities: ['wifi', 'parking'],
  city: 'Lisbon',
  country: 'Portugal',
  coordinates: { latitude: 38.7127, longitude: -9.1288 },
  availability: null,
};

describe('fetchListing', () => {
  it('returns the parsed listing', async () => {
    fetchMock.mockResolvedValue(stubResponse(LISTING));

    await expect(fetchListing(LISTING.id)).resolves.toEqual(LISTING);
  });

  it('returns null for a 404, rather than throwing', async () => {
    fetchMock.mockResolvedValue(
      stubResponse({ error: { message: 'Listing not found' } }, { status: 404 }),
    );

    await expect(fetchListing('unknown-id')).resolves.toBeNull();
  });

  it('surfaces the message from the api error envelope for a non-404 failure', async () => {
    fetchMock.mockResolvedValue(
      stubResponse({ error: { message: 'Internal Server Error' } }, { status: 500 }),
    );

    await expect(fetchListing(LISTING.id)).rejects.toThrow(
      'GET /listings/:id failed with status 500: Internal Server Error',
    );
  });

  it('rejects a payload that does not match the contract', async () => {
    fetchMock.mockResolvedValue(stubResponse({ id: LISTING.id }));

    await expect(fetchListing(LISTING.id)).rejects.toThrow();
  });
});
