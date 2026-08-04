import type { Booking } from '@travel-booking/core';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FIXTURE_BOOKING } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import MyBookingsPage from './page';

const API_URL = 'http://localhost:4000';

// The Next.js font loader transform only runs inside Next's own build, not
// under Vitest, so next/font/google resolves to no usable export here.
vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ className: 'font-display-mock' }),
}));

const redirectMock = vi.fn((path: string) => {
  // Mirrors next/navigation's real redirect(), which throws to halt
  // rendering — the page relies on this to short-circuit before fetchMyBookings.
  throw new Error(`NEXT_REDIRECT: ${path}`);
});
vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirectMock(path),
}));

beforeEach(() => {
  redirectMock.mockClear();
});

describe('MyBookingsPage', () => {
  it('redirects to /sign-in with this page as the redirect param when signed out', async () => {
    server.use(http.get(`${API_URL}/api/auth/get-session`, () => HttpResponse.json(null)));
    // The default handler would otherwise silently serve the happy path and
    // this omission would go unnoticed — wrap it in a spy to prove no request
    // reached the network boundary at all.
    const fetchMyBookingsSpy = vi.fn();
    server.use(
      http.get(`${API_URL}/bookings/mine`, () => {
        fetchMyBookingsSpy();
        return HttpResponse.json([]);
      }),
    );

    await expect(MyBookingsPage()).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectMock).toHaveBeenCalledWith(
      `/sign-in?redirect=${encodeURIComponent('/my-bookings')}`,
    );
    expect(fetchMyBookingsSpy).not.toHaveBeenCalled();
  });

  it('renders normally, with no redirect, when signed in', async () => {
    const ui = await MyBookingsPage();
    render(ui);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'My Bookings' })).toBeInTheDocument();
  });

  it('shows an empty state when the customer has no bookings', async () => {
    const ui = await MyBookingsPage();
    render(ui);

    expect(screen.getByText('No bookings yet')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Your bookings' })).not.toBeInTheDocument();
  });

  it('lists each booking, linking to its confirmation page', async () => {
    server.use(http.get(`${API_URL}/bookings/mine`, () => HttpResponse.json([FIXTURE_BOOKING])));

    const ui = await MyBookingsPage();
    render(ui);

    expect(screen.queryByText('No bookings yet')).not.toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Jane Doe/ });
    expect(link).toHaveAttribute('href', `/bookings/${FIXTURE_BOOKING.id}`);
    expect(link).toHaveTextContent('2026-08-05 – 2026-08-10 · 5 nights');
    expect(link).toHaveTextContent('410 EUR total');
    expect(screen.getByText('1 stay')).toBeInTheDocument();
  });

  it('lists multiple bookings', async () => {
    const secondBooking: Booking = { ...FIXTURE_BOOKING, id: 'booking-2', guestName: 'John Smith' };
    server.use(
      http.get(`${API_URL}/bookings/mine`, () =>
        HttpResponse.json([FIXTURE_BOOKING, secondBooking]),
      ),
    );

    const ui = await MyBookingsPage();
    render(ui);

    expect(screen.getAllByRole('link', { name: /Doe|Smith/ })).toHaveLength(2);
    expect(screen.getByText('2 stays')).toBeInTheDocument();
  });
});
