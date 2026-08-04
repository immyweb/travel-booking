import type { Booking, ClientCreateBooking } from '@travel-booking/core';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';
import { submitBooking } from './_actions';

const API_URL = 'http://localhost:4000';

const redirectMock = vi.fn((path: string) => {
  // Mirrors next/navigation's real redirect(), which throws to halt
  // execution — the action relies on this to skip past the return statement.
  throw new Error(`NEXT_REDIRECT: ${path}`);
});
vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirectMock(path),
}));

// Deliberately different from mocks/fixtures' FIXTURE_BOOKING — a UUID
// listingId, to match what the real createBooking input schema expects.
const VALID_INPUT: ClientCreateBooking = {
  listingId: '11111111-1111-4111-8111-111111111111',
  checkIn: '2026-08-05',
  checkOut: '2026-08-10',
  guests: 2,
  guestName: 'Jane Doe',
  guestEmail: 'jane@example.com',
};

const BOOKING: Booking = {
  id: 'booking-1',
  listingId: VALID_INPUT.listingId,
  userId: 'user-1',
  checkIn: '2026-08-05',
  checkOut: '2026-08-10',
  guests: 2,
  guestName: 'Jane Doe',
  guestEmail: 'jane@example.com',
  nights: 5,
  totalPrice: 410,
  currency: 'EUR',
  status: 'confirmed',
};

beforeEach(() => {
  redirectMock.mockClear();
});

describe('submitBooking', () => {
  it('returns a validation error without calling createBooking when a field is missing', async () => {
    // The default handler would otherwise silently serve the happy path and
    // this omission would go unnoticed — wrap it in a spy to prove no request
    // reached the network boundary at all.
    const createBookingSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/bookings`, () => {
        createBookingSpy();
        return HttpResponse.json(BOOKING, { status: 201 });
      }),
    );

    const state = await submitBooking(null, { ...VALID_INPUT, guestName: '' });

    expect(state?.error).toBeTruthy();
    expect(createBookingSpy).not.toHaveBeenCalled();
  });

  it('returns a validation error for reversed dates without calling createBooking', async () => {
    const createBookingSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/bookings`, () => {
        createBookingSpy();
        return HttpResponse.json(BOOKING, { status: 201 });
      }),
    );

    const state = await submitBooking(null, {
      ...VALID_INPUT,
      checkIn: '2026-08-10',
      checkOut: '2026-08-05',
    });

    expect(state?.error).toBeTruthy();
    expect(createBookingSpy).not.toHaveBeenCalled();
  });

  it('redirects to the new booking on success', async () => {
    server.use(http.post(`${API_URL}/bookings`, () => HttpResponse.json(BOOKING, { status: 201 })));

    await expect(submitBooking(null, VALID_INPUT)).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectMock).toHaveBeenCalledWith(`/bookings/${BOOKING.id}`);
  });

  it('returns an inline error and does not redirect on a conflict', async () => {
    server.use(
      http.post(`${API_URL}/bookings`, () =>
        HttpResponse.json({ error: { message: 'conflict' } }, { status: 409 }),
      ),
    );

    const state = await submitBooking(null, VALID_INPUT);

    expect(state?.error).toMatch(/no longer available/i);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("returns the api's message and does not redirect when the api rejects as invalid", async () => {
    server.use(
      http.post(`${API_URL}/bookings`, () =>
        HttpResponse.json(
          { error: { message: "guests exceeds this listing's maxGuests (4)" } },
          { status: 400 },
        ),
      ),
    );

    const state = await submitBooking(null, VALID_INPUT);

    expect(state?.error).toBe("guests exceeds this listing's maxGuests (4)");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
