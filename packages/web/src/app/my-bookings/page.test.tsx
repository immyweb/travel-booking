import type { Booking } from '@travel-booking/core';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMyBookings, fetchSession } from '@/lib/api';
import MyBookingsPage from './page';

vi.mock('@/lib/api', () => ({
  fetchMyBookings: vi.fn(),
  fetchSession: vi.fn(),
}));

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

const MOCK_BOOKING: Booking = {
  id: 'booking-1',
  listingId: 'listing-1',
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

beforeEach(() => {
  vi.mocked(fetchSession).mockResolvedValue({
    id: 'user-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
  });
  vi.mocked(fetchMyBookings).mockResolvedValue([]);
  redirectMock.mockClear();
});

describe('MyBookingsPage', () => {
  it('redirects to /sign-in with this page as the redirect param when signed out', async () => {
    vi.mocked(fetchSession).mockResolvedValue(null);

    await expect(MyBookingsPage()).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectMock).toHaveBeenCalledWith(
      `/sign-in?redirect=${encodeURIComponent('/my-bookings')}`,
    );
    expect(fetchMyBookings).not.toHaveBeenCalled();
  });

  it('renders normally, with no redirect, when signed in', async () => {
    const ui = await MyBookingsPage();
    render(ui);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'My Bookings' })).toBeInTheDocument();
  });

  it('shows an empty state when the customer has no bookings', async () => {
    vi.mocked(fetchMyBookings).mockResolvedValue([]);

    const ui = await MyBookingsPage();
    render(ui);

    expect(screen.getByText('No bookings yet')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Your bookings' })).not.toBeInTheDocument();
  });

  it('lists each booking, linking to its confirmation page', async () => {
    vi.mocked(fetchMyBookings).mockResolvedValue([MOCK_BOOKING]);

    const ui = await MyBookingsPage();
    render(ui);

    expect(screen.queryByText('No bookings yet')).not.toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Jane Doe/ });
    expect(link).toHaveAttribute('href', `/bookings/${MOCK_BOOKING.id}`);
    expect(link).toHaveTextContent('2026-08-05 – 2026-08-10 · 5 nights');
    expect(link).toHaveTextContent('410 EUR total');
  });

  it('lists multiple bookings', async () => {
    const secondBooking: Booking = { ...MOCK_BOOKING, id: 'booking-2', guestName: 'John Smith' };
    vi.mocked(fetchMyBookings).mockResolvedValue([MOCK_BOOKING, secondBooking]);

    const ui = await MyBookingsPage();
    render(ui);

    expect(screen.getAllByRole('link', { name: /Doe|Smith/ })).toHaveLength(2);
  });
});
