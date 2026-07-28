import type {
  Booking,
  CitiesResponse,
  CreateBooking,
  ListingDetail,
  SearchResponse,
} from '@travel-booking/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBooking,
  fetchBooking,
  fetchCities,
  fetchListing,
  fetchSearchResults,
} from '@/lib/api';

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

  it('appends checkIn/checkOut as query params when dates are supplied', async () => {
    fetchMock.mockResolvedValue(stubResponse(LISTING));

    await fetchListing(LISTING.id, { checkIn: '2026-08-05', checkOut: '2026-08-10' });

    expect(Object.fromEntries(requestedUrl().searchParams)).toEqual({
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
    });
  });

  it('omits the query string entirely when no dates are supplied', async () => {
    fetchMock.mockResolvedValue(stubResponse(LISTING));

    await fetchListing(LISTING.id);

    expect(requestedUrl().search).toBe('');
  });
});

const CREATE_BOOKING: CreateBooking = {
  listingId: LISTING.id,
  checkIn: '2026-08-05',
  checkOut: '2026-08-10',
  guests: 2,
  guestName: 'Jane Doe',
  guestEmail: 'jane@example.com',
};

const BOOKING: Booking = {
  id: 'booking-1',
  listingId: LISTING.id,
  checkIn: '2026-08-05',
  checkOut: '2026-08-10',
  guests: 2,
  guestName: 'Jane Doe',
  guestEmail: 'jane@example.com',
  nights: 5,
  totalPrice: 410,
  currency: 'EUR',
};

describe('createBooking', () => {
  it('returns the parsed booking on success', async () => {
    fetchMock.mockResolvedValue(stubResponse(BOOKING, { status: 201 }));

    await expect(createBooking(CREATE_BOOKING)).resolves.toEqual({ ok: true, booking: BOOKING });
  });

  it('POSTs the input as the JSON body', async () => {
    fetchMock.mockResolvedValue(stubResponse(BOOKING, { status: 201 }));

    await createBooking(CREATE_BOOKING);

    const call = fetchMock.mock.calls[0]!;
    expect(call[0]).toBe('http://localhost:4000/bookings');
    expect(call[1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse(call[1].body)).toEqual(CREATE_BOOKING);
  });

  it('returns a conflict result for a 409, rather than throwing', async () => {
    fetchMock.mockResolvedValue(stubResponse({ error: { message: 'conflict' } }, { status: 409 }));

    await expect(createBooking(CREATE_BOOKING)).resolves.toEqual({
      ok: false,
      reason: 'conflict',
    });
  });

  it('returns an invalid result carrying the api message for a 400, rather than throwing', async () => {
    fetchMock.mockResolvedValue(
      stubResponse(
        { error: { message: "guests exceeds this listing's maxGuests (4)" } },
        { status: 400 },
      ),
    );

    await expect(createBooking(CREATE_BOOKING)).resolves.toEqual({
      ok: false,
      reason: 'invalid',
      message: "guests exceeds this listing's maxGuests (4)",
    });
  });

  it('falls back to a generic message for a 400 whose body is not the error envelope', async () => {
    fetchMock.mockResolvedValue(stubResponse(null, { status: 400, unparseable: true }));

    await expect(createBooking(CREATE_BOOKING)).resolves.toEqual({
      ok: false,
      reason: 'invalid',
      message: 'Invalid booking details',
    });
  });

  it('surfaces the message from the api error envelope for a non-400/409 failure', async () => {
    fetchMock.mockResolvedValue(
      stubResponse({ error: { message: 'Internal Server Error' } }, { status: 500 }),
    );

    await expect(createBooking(CREATE_BOOKING)).rejects.toThrow(
      'POST /bookings failed with status 500: Internal Server Error',
    );
  });

  it('rejects a payload that does not match the contract', async () => {
    fetchMock.mockResolvedValue(stubResponse({ id: BOOKING.id }, { status: 201 }));

    await expect(createBooking(CREATE_BOOKING)).rejects.toThrow();
  });
});

describe('fetchBooking', () => {
  it('returns the parsed booking', async () => {
    fetchMock.mockResolvedValue(stubResponse(BOOKING));

    await expect(fetchBooking(BOOKING.id)).resolves.toEqual(BOOKING);
  });

  it('returns null for a 404, rather than throwing', async () => {
    fetchMock.mockResolvedValue(
      stubResponse({ error: { message: 'Booking not found' } }, { status: 404 }),
    );

    await expect(fetchBooking('unknown-id')).resolves.toBeNull();
  });

  it('returns null for a 400 (a malformed id), the same as an unknown one', async () => {
    fetchMock.mockResolvedValue(
      stubResponse({ error: { message: 'Invalid params' } }, { status: 400 }),
    );

    await expect(fetchBooking('not-a-uuid')).resolves.toBeNull();
  });

  it('surfaces the message from the api error envelope for a non-400/404 failure', async () => {
    fetchMock.mockResolvedValue(
      stubResponse({ error: { message: 'Internal Server Error' } }, { status: 500 }),
    );

    await expect(fetchBooking(BOOKING.id)).rejects.toThrow(
      'GET /bookings/:id failed with status 500: Internal Server Error',
    );
  });

  it('rejects a payload that does not match the contract', async () => {
    fetchMock.mockResolvedValue(stubResponse({ id: BOOKING.id }));

    await expect(fetchBooking(BOOKING.id)).rejects.toThrow();
  });
});
