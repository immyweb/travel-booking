import type {
  Booking,
  CitiesResponse,
  ClientCreateBooking,
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
  fetchSession,
  signIn,
  signOut,
  signUp,
} from '@/lib/api';

const fetchMock = vi.fn();

const cookieStore = {
  set: vi.fn(),
  getAll: vi.fn((): { name: string; value: string }[] => []),
};

// next/headers only works inside a real request scope, which vitest never
// provides — every lib/api.ts function that reads/writes cookies goes through
// this fake store instead.
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}));

// Only the members lib/api.ts actually reads, so the stub can't drift into
// asserting things about undici's Response that we don't depend on.
function stubResponse(
  body: unknown,
  init: {
    status?: number;
    statusText?: string;
    unparseable?: boolean;
    setCookie?: string[];
  } = {},
) {
  const status = init.status ?? 200;

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: init.statusText ?? '',
    headers: { getSetCookie: () => init.setCookie ?? [] },
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
  cookieStore.set.mockClear();
  cookieStore.getAll.mockReset().mockReturnValue([]);
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

  it('returns null for a 400 (a malformed id), the same as an unknown one', async () => {
    fetchMock.mockResolvedValue(
      stubResponse({ error: { message: 'Invalid params' } }, { status: 400 }),
    );

    await expect(fetchListing('not-a-uuid')).resolves.toBeNull();
  });

  it('surfaces the message from the api error envelope for a non-400/404 failure', async () => {
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

const CREATE_BOOKING: ClientCreateBooking = {
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
  userId: 'user-1',
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

  it('POSTs the input as the JSON body, forwarding the current session cookie', async () => {
    cookieStore.getAll.mockReturnValue([{ name: 'better-auth.session_token', value: 'abc123' }]);
    fetchMock.mockResolvedValue(stubResponse(BOOKING, { status: 201 }));

    await createBooking(CREATE_BOOKING);

    const call = fetchMock.mock.calls[0]!;
    expect(call[0]).toBe('http://localhost:4000/bookings');
    expect(call[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ Cookie: 'better-auth.session_token=abc123' }),
    });
    expect(JSON.parse(call[1].body)).toEqual(CREATE_BOOKING);
  });

  it('returns an invalid result with a sign-in prompt for a 401, rather than throwing', async () => {
    fetchMock.mockResolvedValue(
      stubResponse({ error: { message: 'Unauthorized' } }, { status: 401 }),
    );

    await expect(createBooking(CREATE_BOOKING)).resolves.toEqual({
      ok: false,
      reason: 'invalid',
      message: 'Please sign in to complete your booking.',
    });
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

const SESSION_COOKIE =
  'better-auth.session_token=abc123; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax';

describe('signUp', () => {
  it('forwards the Set-Cookie header onto the outgoing response on success', async () => {
    fetchMock.mockResolvedValue(
      stubResponse({ user: { id: 'u1' } }, { setCookie: [SESSION_COOKIE] }),
    );

    await expect(
      signUp({ name: 'Jane Doe', email: 'jane@example.com', password: 'password123' }),
    ).resolves.toEqual({ ok: true });

    expect(cookieStore.set).toHaveBeenCalledExactlyOnceWith('better-auth.session_token', 'abc123', {
      path: '/',
      maxAge: 604800,
      httpOnly: true,
      sameSite: 'lax',
    });
  });

  it('POSTs the input to Better Auth with an Origin header, and sets no cookie', async () => {
    fetchMock.mockResolvedValue(stubResponse({ user: { id: 'u1' } }));

    await signUp({ name: 'Jane Doe', email: 'jane@example.com', password: 'password123' });

    const call = fetchMock.mock.calls[0]!;
    expect(call[0]).toBe('http://localhost:4000/api/auth/sign-up/email');
    expect(call[1]).toMatchObject({ method: 'POST', headers: { Origin: 'http://localhost:3000' } });
    expect(JSON.parse(call[1].body)).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
    });
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("returns the api's own message for an already-registered email, rather than throwing", async () => {
    fetchMock.mockResolvedValue(
      stubResponse(
        { message: 'User already exists. Use another email.', code: 'USER_ALREADY_EXISTS' },
        { status: 422 },
      ),
    );

    await expect(
      signUp({ name: 'Jane Doe', email: 'jane@example.com', password: 'password123' }),
    ).resolves.toEqual({ ok: false, message: 'User already exists. Use another email.' });
  });

  it('falls back to a generic message when the failure body has no message', async () => {
    fetchMock.mockResolvedValue(stubResponse(null, { status: 500, unparseable: true }));

    await expect(
      signUp({ name: 'Jane Doe', email: 'jane@example.com', password: 'password123' }),
    ).resolves.toEqual({ ok: false, message: 'Could not create your account.' });
  });
});

describe('signIn', () => {
  it('forwards the Set-Cookie header onto the outgoing response on success', async () => {
    fetchMock.mockResolvedValue(
      stubResponse({ user: { id: 'u1' } }, { setCookie: [SESSION_COOKIE] }),
    );

    await expect(signIn({ email: 'jane@example.com', password: 'password123' })).resolves.toEqual({
      ok: true,
    });

    expect(cookieStore.set).toHaveBeenCalledExactlyOnceWith('better-auth.session_token', 'abc123', {
      path: '/',
      maxAge: 604800,
      httpOnly: true,
      sameSite: 'lax',
    });
  });

  it('returns the same message for a wrong password as an unregistered email', async () => {
    fetchMock.mockResolvedValue(
      stubResponse(
        { message: 'Invalid email or password', code: 'INVALID_EMAIL_OR_PASSWORD' },
        { status: 401 },
      ),
    );

    await expect(signIn({ email: 'jane@example.com', password: 'wrong' })).resolves.toEqual({
      ok: false,
      message: 'Invalid email or password',
    });
  });
});

describe('signOut', () => {
  it('forwards the current session cookie to the api, then re-sets the cleared cookies it returns', async () => {
    cookieStore.getAll.mockReturnValue([{ name: 'better-auth.session_token', value: 'abc123' }]);
    fetchMock.mockResolvedValue(
      stubResponse(
        { success: true },
        { setCookie: ['better-auth.session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax'] },
      ),
    );

    await signOut();

    const call = fetchMock.mock.calls[0]!;
    expect(call[0]).toBe('http://localhost:4000/api/auth/sign-out');
    expect(call[1]).toMatchObject({
      method: 'POST',
      headers: {
        Cookie: 'better-auth.session_token=abc123',
        Origin: 'http://localhost:3000',
      },
    });
    expect(cookieStore.set).toHaveBeenCalledExactlyOnceWith('better-auth.session_token', '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
    });
  });
});

describe('fetchSession', () => {
  it('returns the signed-in user, forwarding the current cookies as the Cookie header', async () => {
    cookieStore.getAll.mockReturnValue([{ name: 'better-auth.session_token', value: 'abc123' }]);
    fetchMock.mockResolvedValue(
      stubResponse({
        session: { id: 's1' },
        user: { id: 'u1', name: 'Jane Doe', email: 'jane@example.com' },
      }),
    );

    await expect(fetchSession()).resolves.toEqual({
      id: 'u1',
      name: 'Jane Doe',
      email: 'jane@example.com',
    });

    const call = fetchMock.mock.calls[0]!;
    expect(call[0]).toBe('http://localhost:4000/api/auth/get-session');
    expect(call[1]).toMatchObject({
      headers: { Cookie: 'better-auth.session_token=abc123', Origin: 'http://localhost:3000' },
    });
  });

  it('returns null when signed out, rather than throwing', async () => {
    fetchMock.mockResolvedValue(stubResponse(null));

    await expect(fetchSession()).resolves.toBeNull();
  });

  it('surfaces the message from the api error envelope for a failure', async () => {
    fetchMock.mockResolvedValue(
      stubResponse({ message: 'Internal Server Error' }, { status: 500 }),
    );

    await expect(fetchSession()).rejects.toThrow(
      'GET /api/auth/get-session failed with status 500: Internal Server Error',
    );
  });
});
