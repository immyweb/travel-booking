import type { Booking } from '@travel-booking/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBooking } from '@/lib/api';
import { submitBooking } from './_actions';

vi.mock('@/lib/api', () => ({
  createBooking: vi.fn(),
}));

const redirectMock = vi.fn((path: string) => {
  // Mirrors next/navigation's real redirect(), which throws to halt
  // execution — the action relies on this to skip past the return statement.
  throw new Error(`NEXT_REDIRECT: ${path}`);
});
vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirectMock(path),
}));

const VALID_FORM_DATA = {
  listingId: '11111111-1111-4111-8111-111111111111',
  checkIn: '2026-08-05',
  checkOut: '2026-08-10',
  guests: '2',
  guestName: 'Jane Doe',
  guestEmail: 'jane@example.com',
};

function formDataFrom(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

const BOOKING: Booking = {
  id: 'booking-1',
  listingId: VALID_FORM_DATA.listingId,
  checkIn: '2026-08-05',
  checkOut: '2026-08-10',
  guests: 2,
  guestName: 'Jane Doe',
  guestEmail: 'jane@example.com',
  nights: 5,
  totalPrice: 410,
  currency: 'EUR',
};

beforeEach(() => {
  redirectMock.mockClear();
  vi.mocked(createBooking).mockReset();
});

describe('submitBooking', () => {
  it('returns a validation error without calling createBooking when a field is missing', async () => {
    const formData = formDataFrom({ ...VALID_FORM_DATA, guestName: '' });

    const state = await submitBooking(null, formData);

    expect(state?.error).toBeTruthy();
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('returns a validation error for reversed dates without calling createBooking', async () => {
    const formData = formDataFrom({
      ...VALID_FORM_DATA,
      checkIn: '2026-08-10',
      checkOut: '2026-08-05',
    });

    const state = await submitBooking(null, formData);

    expect(state?.error).toBeTruthy();
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('redirects to the new booking on success', async () => {
    vi.mocked(createBooking).mockResolvedValue({ ok: true, booking: BOOKING });
    const formData = formDataFrom(VALID_FORM_DATA);

    await expect(submitBooking(null, formData)).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectMock).toHaveBeenCalledWith(`/bookings/${BOOKING.id}`);
  });

  it('returns an inline error and does not redirect on a conflict', async () => {
    vi.mocked(createBooking).mockResolvedValue({ ok: false, reason: 'conflict' });
    const formData = formDataFrom(VALID_FORM_DATA);

    const state = await submitBooking(null, formData);

    expect(state?.error).toMatch(/no longer available/i);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("returns the api's message and does not redirect when the api rejects as invalid", async () => {
    vi.mocked(createBooking).mockResolvedValue({
      ok: false,
      reason: 'invalid',
      message: "guests exceeds this listing's maxGuests (4)",
    });
    const formData = formDataFrom(VALID_FORM_DATA);

    const state = await submitBooking(null, formData);

    expect(state?.error).toBe("guests exceeds this listing's maxGuests (4)");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
