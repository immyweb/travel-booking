import type { ClientCreateBooking } from '@travel-booking/core';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  createBooking,
  fetchBooking,
  fetchCities,
  fetchListing,
  fetchMyBookings,
  fetchSearchResults,
  fetchSession,
  signIn,
  signOut,
  signUp,
} from '@/lib/api';
import {
  FIXTURE_BOOKING,
  FIXTURE_CITIES,
  FIXTURE_LISTING,
  FIXTURE_SEARCH_RESPONSE,
  FIXTURE_SESSION_USER,
} from '@/mocks/fixtures';
import { cookieStore } from '@/mocks/next-headers';
import { jsonWithSetCookie } from '@/mocks/responses';
import { server } from '@/mocks/server';

const API_URL = 'http://localhost:4000';

const QUERY = { lat: 38.7169, lng: -9.1399, radiusKm: 25, page: 1, size: 12 };

describe('fetchCities', () => {
  it('returns the parsed cities', async () => {
    await expect(fetchCities()).resolves.toEqual(FIXTURE_CITIES);
  });

  it('rejects a payload that does not match the contract', async () => {
    // Previously cast rather than parsed, so this shape reached the page and
    // failed later as an undefined during render.
    server.use(
      http.get(`${API_URL}/search/cities`, () =>
        HttpResponse.json({ cities: [{ city: 'Lisbon' }] }),
      ),
    );

    await expect(fetchCities()).rejects.toThrow();
  });

  it('surfaces the message from the api error envelope', async () => {
    server.use(
      http.get(`${API_URL}/search/cities`, () =>
        HttpResponse.json({ error: { message: 'Internal Server Error' } }, { status: 500 }),
      ),
    );

    await expect(fetchCities()).rejects.toThrow(
      'GET /search/cities failed with status 500: Internal Server Error',
    );
  });

  it('falls back to statusText when the body is not our envelope', async () => {
    server.use(
      http.get(
        `${API_URL}/search/cities`,
        () => new HttpResponse('not json', { status: 502, statusText: 'Bad Gateway' }),
      ),
    );

    await expect(fetchCities()).rejects.toThrow(
      'GET /search/cities failed with status 502: Bad Gateway',
    );
  });
});

describe('fetchSearchResults', () => {
  it('returns the parsed search response', async () => {
    await expect(fetchSearchResults(QUERY)).resolves.toEqual(FIXTURE_SEARCH_RESPONSE);
  });

  it('serialises every query field it was given', async () => {
    let requestUrl: URL | undefined;
    server.use(
      http.get(`${API_URL}/search`, ({ request }) => {
        requestUrl = new URL(request.url);
        return HttpResponse.json(FIXTURE_SEARCH_RESPONSE);
      }),
    );

    await fetchSearchResults({ ...QUERY, country: 'Portugal' });

    expect(Object.fromEntries(requestUrl!.searchParams)).toEqual({
      lat: '38.7169',
      lng: '-9.1399',
      radiusKm: '25',
      page: '1',
      size: '12',
      country: 'Portugal',
    });
  });

  it('omits an absent optional filter rather than sending undefined', async () => {
    let requestUrl: URL | undefined;
    server.use(
      http.get(`${API_URL}/search`, ({ request }) => {
        requestUrl = new URL(request.url);
        return HttpResponse.json(FIXTURE_SEARCH_RESPONSE);
      }),
    );

    await fetchSearchResults(QUERY);

    expect(requestUrl!.searchParams.has('country')).toBe(false);
  });

  it('rejects a payload that does not match the contract', async () => {
    server.use(
      http.get(`${API_URL}/search`, () =>
        HttpResponse.json({ pagination: FIXTURE_SEARCH_RESPONSE.pagination }),
      ),
    );

    await expect(fetchSearchResults(QUERY)).rejects.toThrow();
  });
});

describe('fetchListing', () => {
  it('returns the parsed listing', async () => {
    await expect(fetchListing(FIXTURE_LISTING.id)).resolves.toEqual(FIXTURE_LISTING);
  });

  it('returns null for a 404, rather than throwing', async () => {
    server.use(
      http.get(`${API_URL}/listings/:id`, () =>
        HttpResponse.json({ error: { message: 'Listing not found' } }, { status: 404 }),
      ),
    );

    await expect(fetchListing('unknown-id')).resolves.toBeNull();
  });

  it('returns null for a 400 (a malformed id), the same as an unknown one', async () => {
    server.use(
      http.get(`${API_URL}/listings/:id`, () =>
        HttpResponse.json({ error: { message: 'Invalid params' } }, { status: 400 }),
      ),
    );

    await expect(fetchListing('not-a-uuid')).resolves.toBeNull();
  });

  it('surfaces the message from the api error envelope for a non-400/404 failure', async () => {
    server.use(
      http.get(`${API_URL}/listings/:id`, () =>
        HttpResponse.json({ error: { message: 'Internal Server Error' } }, { status: 500 }),
      ),
    );

    await expect(fetchListing(FIXTURE_LISTING.id)).rejects.toThrow(
      'GET /listings/:id failed with status 500: Internal Server Error',
    );
  });

  it('rejects a payload that does not match the contract', async () => {
    server.use(
      http.get(`${API_URL}/listings/:id`, () => HttpResponse.json({ id: FIXTURE_LISTING.id })),
    );

    await expect(fetchListing(FIXTURE_LISTING.id)).rejects.toThrow();
  });

  it('appends checkIn/checkOut as query params when dates are supplied', async () => {
    let requestUrl: URL | undefined;
    server.use(
      http.get(`${API_URL}/listings/:id`, ({ request }) => {
        requestUrl = new URL(request.url);
        return HttpResponse.json(FIXTURE_LISTING);
      }),
    );

    await fetchListing(FIXTURE_LISTING.id, { checkIn: '2026-08-05', checkOut: '2026-08-10' });

    expect(Object.fromEntries(requestUrl!.searchParams)).toEqual({
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
    });
  });

  it('omits the query string entirely when no dates are supplied', async () => {
    let requestUrl: URL | undefined;
    server.use(
      http.get(`${API_URL}/listings/:id`, ({ request }) => {
        requestUrl = new URL(request.url);
        return HttpResponse.json(FIXTURE_LISTING);
      }),
    );

    await fetchListing(FIXTURE_LISTING.id);

    expect(requestUrl!.search).toBe('');
  });
});

const CREATE_BOOKING: ClientCreateBooking = {
  listingId: FIXTURE_LISTING.id,
  checkIn: '2026-08-05',
  checkOut: '2026-08-10',
  guests: 2,
  guestName: 'Jane Doe',
  guestEmail: 'jane@example.com',
};

describe('createBooking', () => {
  it('returns the parsed booking on success', async () => {
    await expect(createBooking(CREATE_BOOKING)).resolves.toEqual({
      ok: true,
      booking: FIXTURE_BOOKING,
    });
  });

  it('POSTs the input as the JSON body, forwarding the current session cookie', async () => {
    cookieStore.getAll.mockReturnValue([{ name: 'better-auth.session_token', value: 'abc123' }]);
    let capturedRequest: Request | undefined;
    server.use(
      http.post(`${API_URL}/bookings`, async ({ request }) => {
        capturedRequest = request.clone();
        return HttpResponse.json(FIXTURE_BOOKING, { status: 201 });
      }),
    );

    await createBooking(CREATE_BOOKING);

    expect(capturedRequest!.headers.get('Cookie')).toBe('better-auth.session_token=abc123');
    expect(await capturedRequest!.json()).toEqual(CREATE_BOOKING);
  });

  it('returns an invalid result with a sign-in prompt for a 401, rather than throwing', async () => {
    server.use(
      http.post(`${API_URL}/bookings`, () =>
        HttpResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 }),
      ),
    );

    await expect(createBooking(CREATE_BOOKING)).resolves.toEqual({
      ok: false,
      reason: 'invalid',
      message: 'Please sign in to complete your booking.',
    });
  });

  it('returns a conflict result for a 409, rather than throwing', async () => {
    server.use(
      http.post(`${API_URL}/bookings`, () =>
        HttpResponse.json({ error: { message: 'conflict' } }, { status: 409 }),
      ),
    );

    await expect(createBooking(CREATE_BOOKING)).resolves.toEqual({
      ok: false,
      reason: 'conflict',
    });
  });

  it('returns an invalid result carrying the api message for a 400, rather than throwing', async () => {
    server.use(
      http.post(`${API_URL}/bookings`, () =>
        HttpResponse.json(
          { error: { message: "guests exceeds this listing's maxGuests (4)" } },
          { status: 400 },
        ),
      ),
    );

    await expect(createBooking(CREATE_BOOKING)).resolves.toEqual({
      ok: false,
      reason: 'invalid',
      message: "guests exceeds this listing's maxGuests (4)",
    });
  });

  it('falls back to a generic message for a 400 whose body is not the error envelope', async () => {
    server.use(http.post(`${API_URL}/bookings`, () => new HttpResponse(null, { status: 400 })));

    await expect(createBooking(CREATE_BOOKING)).resolves.toEqual({
      ok: false,
      reason: 'invalid',
      message: 'Invalid booking details',
    });
  });

  it('surfaces the message from the api error envelope for a non-400/409 failure', async () => {
    server.use(
      http.post(`${API_URL}/bookings`, () =>
        HttpResponse.json({ error: { message: 'Internal Server Error' } }, { status: 500 }),
      ),
    );

    await expect(createBooking(CREATE_BOOKING)).rejects.toThrow(
      'POST /bookings failed with status 500: Internal Server Error',
    );
  });

  it('rejects a payload that does not match the contract', async () => {
    server.use(
      http.post(`${API_URL}/bookings`, () =>
        HttpResponse.json({ id: FIXTURE_BOOKING.id }, { status: 201 }),
      ),
    );

    await expect(createBooking(CREATE_BOOKING)).rejects.toThrow();
  });
});

describe('fetchBooking', () => {
  it('returns the parsed booking', async () => {
    await expect(fetchBooking(FIXTURE_BOOKING.id)).resolves.toEqual(FIXTURE_BOOKING);
  });

  it('returns null for a 404, rather than throwing', async () => {
    server.use(
      http.get(`${API_URL}/bookings/:id`, () =>
        HttpResponse.json({ error: { message: 'Booking not found' } }, { status: 404 }),
      ),
    );

    await expect(fetchBooking('unknown-id')).resolves.toBeNull();
  });

  it('returns null for a 400 (a malformed id), the same as an unknown one', async () => {
    server.use(
      http.get(`${API_URL}/bookings/:id`, () =>
        HttpResponse.json({ error: { message: 'Invalid params' } }, { status: 400 }),
      ),
    );

    await expect(fetchBooking('not-a-uuid')).resolves.toBeNull();
  });

  it('surfaces the message from the api error envelope for a non-400/404 failure', async () => {
    server.use(
      http.get(`${API_URL}/bookings/:id`, () =>
        HttpResponse.json({ error: { message: 'Internal Server Error' } }, { status: 500 }),
      ),
    );

    await expect(fetchBooking(FIXTURE_BOOKING.id)).rejects.toThrow(
      'GET /bookings/:id failed with status 500: Internal Server Error',
    );
  });

  it('rejects a payload that does not match the contract', async () => {
    server.use(
      http.get(`${API_URL}/bookings/:id`, () => HttpResponse.json({ id: FIXTURE_BOOKING.id })),
    );

    await expect(fetchBooking(FIXTURE_BOOKING.id)).rejects.toThrow();
  });
});

describe('fetchMyBookings', () => {
  it('returns the parsed bookings, forwarding the current session cookie', async () => {
    cookieStore.getAll.mockReturnValue([{ name: 'better-auth.session_token', value: 'abc123' }]);
    let capturedRequest: Request | undefined;
    server.use(
      http.get(`${API_URL}/bookings/mine`, ({ request }) => {
        capturedRequest = request.clone();
        return HttpResponse.json([FIXTURE_BOOKING]);
      }),
    );

    await expect(fetchMyBookings()).resolves.toEqual([FIXTURE_BOOKING]);

    expect(capturedRequest!.headers.get('Cookie')).toBe('better-auth.session_token=abc123');
  });

  it('returns an empty array when the signed-in user has no bookings', async () => {
    await expect(fetchMyBookings()).resolves.toEqual([]);
  });

  it('surfaces the message from the api error envelope for a failure', async () => {
    server.use(
      http.get(`${API_URL}/bookings/mine`, () =>
        HttpResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 }),
      ),
    );

    await expect(fetchMyBookings()).rejects.toThrow(
      'GET /bookings/mine failed with status 401: Unauthorized',
    );
  });

  it('rejects a payload that does not match the contract', async () => {
    server.use(
      http.get(`${API_URL}/bookings/mine`, () => HttpResponse.json([{ id: FIXTURE_BOOKING.id }])),
    );

    await expect(fetchMyBookings()).rejects.toThrow();
  });
});

const SESSION_COOKIE =
  'better-auth.session_token=abc123; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax';

describe('signUp', () => {
  it('forwards the Set-Cookie header onto the outgoing response on success', async () => {
    server.use(
      http.post(`${API_URL}/api/auth/sign-up/email`, () =>
        jsonWithSetCookie({ user: { id: 'u1' } }, SESSION_COOKIE),
      ),
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
    let capturedRequest: Request | undefined;
    server.use(
      http.post(`${API_URL}/api/auth/sign-up/email`, async ({ request }) => {
        capturedRequest = request.clone();
        return HttpResponse.json({ user: { id: 'u1' } });
      }),
    );

    await signUp({ name: 'Jane Doe', email: 'jane@example.com', password: 'password123' });

    expect(capturedRequest!.headers.get('Origin')).toBe('http://localhost:3000');
    expect(await capturedRequest!.json()).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
    });
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("returns the api's own message for an already-registered email, rather than throwing", async () => {
    server.use(
      http.post(`${API_URL}/api/auth/sign-up/email`, () =>
        HttpResponse.json(
          { message: 'User already exists. Use another email.', code: 'USER_ALREADY_EXISTS' },
          { status: 422 },
        ),
      ),
    );

    await expect(
      signUp({ name: 'Jane Doe', email: 'jane@example.com', password: 'password123' }),
    ).resolves.toEqual({ ok: false, message: 'User already exists. Use another email.' });
  });

  it('falls back to a generic message when the failure body has no message', async () => {
    server.use(
      http.post(`${API_URL}/api/auth/sign-up/email`, () => new HttpResponse(null, { status: 500 })),
    );

    await expect(
      signUp({ name: 'Jane Doe', email: 'jane@example.com', password: 'password123' }),
    ).resolves.toEqual({ ok: false, message: 'Could not create your account.' });
  });
});

describe('signIn', () => {
  it('forwards the Set-Cookie header onto the outgoing response on success', async () => {
    server.use(
      http.post(`${API_URL}/api/auth/sign-in/email`, () =>
        jsonWithSetCookie({ user: { id: 'u1' } }, SESSION_COOKIE),
      ),
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
    server.use(
      http.post(`${API_URL}/api/auth/sign-in/email`, () =>
        HttpResponse.json(
          { message: 'Invalid email or password', code: 'INVALID_EMAIL_OR_PASSWORD' },
          { status: 401 },
        ),
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
    let capturedRequest: Request | undefined;
    server.use(
      http.post(`${API_URL}/api/auth/sign-out`, ({ request }) => {
        capturedRequest = request.clone();
        return jsonWithSetCookie(
          { success: true },
          'better-auth.session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax',
        );
      }),
    );

    await signOut();

    expect(capturedRequest!.headers.get('Cookie')).toBe('better-auth.session_token=abc123');
    expect(capturedRequest!.headers.get('Origin')).toBe('http://localhost:3000');
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
    let capturedRequest: Request | undefined;
    server.use(
      http.get(`${API_URL}/api/auth/get-session`, ({ request }) => {
        capturedRequest = request.clone();
        return HttpResponse.json({ session: { id: 's1' }, user: FIXTURE_SESSION_USER });
      }),
    );

    await expect(fetchSession()).resolves.toEqual(FIXTURE_SESSION_USER);

    expect(capturedRequest!.headers.get('Cookie')).toBe('better-auth.session_token=abc123');
    expect(capturedRequest!.headers.get('Origin')).toBe('http://localhost:3000');
  });

  it('returns null when signed out, rather than throwing', async () => {
    server.use(http.get(`${API_URL}/api/auth/get-session`, () => HttpResponse.json(null)));

    await expect(fetchSession()).resolves.toBeNull();
  });

  it('surfaces the message from the api error envelope for a failure', async () => {
    server.use(
      http.get(`${API_URL}/api/auth/get-session`, () =>
        HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 }),
      ),
    );

    await expect(fetchSession()).rejects.toThrow(
      'GET /api/auth/get-session failed with status 500: Internal Server Error',
    );
  });
});
