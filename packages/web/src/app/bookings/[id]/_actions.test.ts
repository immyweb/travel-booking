import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { FIXTURE_BOOKING } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { checkBookingStatus } from './_actions';

const API_URL = 'http://localhost:4000';

describe('checkBookingStatus', () => {
  it("returns the booking's current status", async () => {
    server.use(
      http.get(`${API_URL}/bookings/:id`, () =>
        HttpResponse.json({ ...FIXTURE_BOOKING, status: 'pending' }),
      ),
    );

    await expect(checkBookingStatus(FIXTURE_BOOKING.id)).resolves.toBe('pending');
  });

  it('returns null when the booking no longer exists', async () => {
    server.use(
      http.get(`${API_URL}/bookings/:id`, () =>
        HttpResponse.json({ error: { message: 'Booking not found' } }, { status: 404 }),
      ),
    );

    await expect(checkBookingStatus('unknown-id')).resolves.toBeNull();
  });
});
