import type { Booking, ListingDetail } from '@travel-booking/core';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBooking, fetchListing } from '@/lib/api';
import BookingConfirmationPage, { generateMetadata } from './page';

vi.mock('@/lib/api', () => ({
  fetchBooking: vi.fn(),
  fetchListing: vi.fn(),
}));

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

const MOCK_LISTING: ListingDetail = {
  id: 'listing-1',
  title: 'Sunny Alfama studio',
  images: [
    'https://images.travel-booking.example/1.jpg',
    'https://images.travel-booking.example/2.jpg',
  ],
  price: 82,
  currency: 'EUR',
  maxGuests: 4,
  amenities: ['wifi', 'parking'],
  city: 'Lisbon',
  country: 'Portugal',
  coordinates: { latitude: 38.7127, longitude: -9.1288 },
  availability: null,
};

const MOCK_BOOKING: Booking = {
  id: 'booking-1',
  listingId: MOCK_LISTING.id,
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
  vi.mocked(fetchBooking).mockReset().mockResolvedValue(MOCK_BOOKING);
  vi.mocked(fetchListing).mockReset().mockResolvedValue(MOCK_LISTING);
  notFoundMock.mockClear();
});

describe('BookingConfirmationPage', () => {
  it('renders the listing title, photo, dates, nights, total price, currency, guest name and email', async () => {
    const ui = await BookingConfirmationPage({ params: Promise.resolve({ id: MOCK_BOOKING.id }) });
    render(ui);

    expect(screen.getByRole('heading', { name: MOCK_LISTING.title })).toBeInTheDocument();
    expect(screen.getByAltText(MOCK_LISTING.title)).toBeInTheDocument();
    expect(screen.getByText('2026-08-05', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('2026-08-10', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('5 nights', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('410 EUR', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it("fetches the listing by the booking's listingId", async () => {
    const ui = await BookingConfirmationPage({ params: Promise.resolve({ id: MOCK_BOOKING.id }) });
    render(ui);

    expect(fetchListing).toHaveBeenCalledWith(MOCK_LISTING.id);
  });

  it('calls notFound when no booking matches the id (unknown or malformed)', async () => {
    vi.mocked(fetchBooking).mockResolvedValue(null);

    await expect(
      BookingConfirmationPage({ params: Promise.resolve({ id: 'unknown-id' }) }),
    ).rejects.toThrow();

    expect(notFoundMock).toHaveBeenCalled();
    expect(fetchListing).not.toHaveBeenCalled();
  });

  it('calls notFound when the booking references a listing that no longer exists', async () => {
    vi.mocked(fetchListing).mockResolvedValue(null);

    await expect(
      BookingConfirmationPage({ params: Promise.resolve({ id: MOCK_BOOKING.id }) }),
    ).rejects.toThrow();

    expect(notFoundMock).toHaveBeenCalled();
  });
});

describe('generateMetadata', () => {
  it('calls notFound when no booking matches the id', async () => {
    vi.mocked(fetchBooking).mockResolvedValue(null);

    await expect(
      generateMetadata({ params: Promise.resolve({ id: 'unknown-id' }) }),
    ).rejects.toThrow();

    expect(notFoundMock).toHaveBeenCalled();
  });
});
