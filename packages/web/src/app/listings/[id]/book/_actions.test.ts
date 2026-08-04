import type { Booking, ClientCreateBooking } from '@travel-booking/core';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';
import { submitBooking } from './_actions';

const API_URL = 'http://localhost:4000';

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
  status: 'pending',
};

const CLIENT_SECRET = 'pi_test_secret';

describe('submitBooking', () => {
  it('returns a validation error without calling createBooking when a field is missing', async () => {
    // The default handler would otherwise silently serve the happy path and
    // this omission would go unnoticed — wrap it in a spy to prove no request
    // reached the network boundary at all.
    const createBookingSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/bookings`, () => {
        createBookingSpy();
        return HttpResponse.json(
          { booking: BOOKING, clientSecret: CLIENT_SECRET },
          { status: 201 },
        );
      }),
    );

    const state = await submitBooking(null, { ...VALID_INPUT, guestName: '' });

    expect(state?.status).toBe('error');
    expect(createBookingSpy).not.toHaveBeenCalled();
  });

  it('returns a validation error for reversed dates without calling createBooking', async () => {
    const createBookingSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/bookings`, () => {
        createBookingSpy();
        return HttpResponse.json(
          { booking: BOOKING, clientSecret: CLIENT_SECRET },
          { status: 201 },
        );
      }),
    );

    const state = await submitBooking(null, {
      ...VALID_INPUT,
      checkIn: '2026-08-10',
      checkOut: '2026-08-05',
    });

    expect(state?.status).toBe('error');
    expect(createBookingSpy).not.toHaveBeenCalled();
  });

  it('returns an awaitingPayment state carrying the bookingId and clientSecret on success', async () => {
    server.use(
      http.post(`${API_URL}/bookings`, () =>
        HttpResponse.json({ booking: BOOKING, clientSecret: CLIENT_SECRET }, { status: 201 }),
      ),
    );

    const state = await submitBooking(null, VALID_INPUT);

    expect(state).toEqual({
      status: 'awaitingPayment',
      bookingId: BOOKING.id,
      clientSecret: CLIENT_SECRET,
    });
  });

  it('returns an inline error on a conflict', async () => {
    server.use(
      http.post(`${API_URL}/bookings`, () =>
        HttpResponse.json({ error: { message: 'conflict' } }, { status: 409 }),
      ),
    );

    const state = await submitBooking(null, VALID_INPUT);

    expect(state?.status).toBe('error');
    expect(state).toMatchObject({ error: expect.stringMatching(/no longer available/i) });
  });

  it("returns the api's message when the api rejects as invalid", async () => {
    server.use(
      http.post(`${API_URL}/bookings`, () =>
        HttpResponse.json(
          { error: { message: "guests exceeds this listing's maxGuests (4)" } },
          { status: 400 },
        ),
      ),
    );

    const state = await submitBooking(null, VALID_INPUT);

    expect(state).toEqual({
      status: 'error',
      error: "guests exceeds this listing's maxGuests (4)",
    });
  });
});
