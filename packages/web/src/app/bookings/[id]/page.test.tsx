import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FIXTURE_BOOKING, FIXTURE_LISTING } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import BookingConfirmationPage, { generateMetadata } from './page';

const API_URL = 'http://localhost:4000';

// The Next.js font loader transform only runs inside Next's own build, not
// under Vitest, so next/font/google resolves to no usable export here.
vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ className: 'font-display-mock' }),
}));

const notFoundMock = vi.fn(() => {
  // Mirrors next/navigation's real notFound(), which throws to halt
  // rendering — callers rely on this to short-circuit past a null result.
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
}));

beforeEach(() => {
  notFoundMock.mockClear();
});

describe('BookingConfirmationPage', () => {
  it('renders the listing title, photo, dates, nights, total price, currency, guest name and email', async () => {
    const ui = await BookingConfirmationPage({
      params: Promise.resolve({ id: FIXTURE_BOOKING.id }),
    });
    render(ui);

    expect(screen.getByRole('heading', { name: FIXTURE_LISTING.title })).toBeInTheDocument();
    expect(screen.getByAltText(FIXTURE_LISTING.title)).toBeInTheDocument();
    expect(screen.getByText('2026-08-05', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('2026-08-10', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('5 nights', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('410 EUR', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it("fetches the listing by the booking's listingId", async () => {
    let requestedId: string | undefined;
    server.use(
      http.get(`${API_URL}/listings/:id`, ({ params }) => {
        requestedId = params.id as string;
        return HttpResponse.json(FIXTURE_LISTING);
      }),
    );

    const ui = await BookingConfirmationPage({
      params: Promise.resolve({ id: FIXTURE_BOOKING.id }),
    });
    render(ui);

    expect(requestedId).toBe(FIXTURE_LISTING.id);
  });

  it('calls notFound when no booking matches the id (unknown or malformed)', async () => {
    server.use(
      http.get(`${API_URL}/bookings/:id`, () =>
        HttpResponse.json({ error: { message: 'Booking not found' } }, { status: 404 }),
      ),
    );
    // The default handler would otherwise silently serve the happy path and
    // this omission would go unnoticed — wrap it in a spy to prove no request
    // reached the network boundary at all.
    const fetchListingSpy = vi.fn();
    server.use(
      http.get(`${API_URL}/listings/:id`, () => {
        fetchListingSpy();
        return HttpResponse.json(FIXTURE_LISTING);
      }),
    );

    await expect(
      BookingConfirmationPage({ params: Promise.resolve({ id: 'unknown-id' }) }),
    ).rejects.toThrow();

    expect(notFoundMock).toHaveBeenCalled();
    expect(fetchListingSpy).not.toHaveBeenCalled();
  });

  it('calls notFound when the booking references a listing that no longer exists', async () => {
    server.use(
      http.get(`${API_URL}/listings/:id`, () =>
        HttpResponse.json({ error: { message: 'Listing not found' } }, { status: 404 }),
      ),
    );

    await expect(
      BookingConfirmationPage({ params: Promise.resolve({ id: FIXTURE_BOOKING.id }) }),
    ).rejects.toThrow();

    expect(notFoundMock).toHaveBeenCalled();
  });

  it('shows a distinct confirming-payment state, not the confirmed view, for a still-pending booking', async () => {
    server.use(
      http.get(`${API_URL}/bookings/:id`, () =>
        HttpResponse.json({ ...FIXTURE_BOOKING, status: 'pending' }),
      ),
    );

    const ui = await BookingConfirmationPage({
      params: Promise.resolve({ id: FIXTURE_BOOKING.id }),
    });
    render(ui);

    expect(screen.getByRole('heading', { name: /confirming your payment/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Booking confirmed' })).not.toBeInTheDocument();
  });
});

describe('generateMetadata', () => {
  it('calls notFound when no booking matches the id', async () => {
    server.use(
      http.get(`${API_URL}/bookings/:id`, () =>
        HttpResponse.json({ error: { message: 'Booking not found' } }, { status: 404 }),
      ),
    );

    await expect(
      generateMetadata({ params: Promise.resolve({ id: 'unknown-id' }) }),
    ).rejects.toThrow();

    expect(notFoundMock).toHaveBeenCalled();
  });
});
