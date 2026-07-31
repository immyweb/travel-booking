import type { ListingDetail } from '@travel-booking/core';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchListing, fetchSession } from '@/lib/api';
import BookListingPage, { generateMetadata } from './page';

vi.mock('@/lib/api', () => ({
  fetchListing: vi.fn(),
  fetchSession: vi.fn(),
}));

// The Next.js font loader transform only runs inside Next's own build, not
// under Vitest, so next/font/google resolves to no usable export here.
vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ className: 'font-display-mock' }),
}));

vi.mock('./_components/BookingForm', () => ({
  BookingForm: (props: {
    listingId: string;
    maxGuests: number;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
  }) => <div data-testid="booking-form">{JSON.stringify(props)}</div>,
}));

const notFoundMock = vi.fn(() => {
  // Mirrors next/navigation's real notFound(), which throws to halt
  // rendering — callers rely on this to short-circuit past a null listing.
  throw new Error('NEXT_NOT_FOUND');
});
const redirectMock = vi.fn((path: string) => {
  // Mirrors next/navigation's real redirect(), which throws to halt
  // rendering — the page relies on this to short-circuit before fetchListing.
  throw new Error(`NEXT_REDIRECT: ${path}`);
});
vi.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
  redirect: (path: string) => redirectMock(path),
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

beforeEach(() => {
  vi.mocked(fetchListing).mockResolvedValue(MOCK_LISTING);
  vi.mocked(fetchSession).mockResolvedValue({
    id: 'user-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
  });
  notFoundMock.mockClear();
  redirectMock.mockClear();
});

describe('BookListingPage', () => {
  it('redirects to /sign-in with this page as the redirect param when signed out', async () => {
    vi.mocked(fetchSession).mockResolvedValue(null);

    await expect(
      BookListingPage({
        params: Promise.resolve({ id: MOCK_LISTING.id }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectMock).toHaveBeenCalledWith(
      `/sign-in?redirect=${encodeURIComponent(`/listings/${MOCK_LISTING.id}/book`)}`,
    );
    expect(fetchListing).not.toHaveBeenCalled();
  });

  it('preserves checkIn/checkOut/guests in the redirect param when signed out', async () => {
    vi.mocked(fetchSession).mockResolvedValue(null);

    await expect(
      BookListingPage({
        params: Promise.resolve({ id: MOCK_LISTING.id }),
        searchParams: Promise.resolve({
          checkIn: '2026-08-05',
          checkOut: '2026-08-10',
          guests: '2',
        }),
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    const expectedBookingPath = `/listings/${MOCK_LISTING.id}/book?checkIn=2026-08-05&checkOut=2026-08-10&guests=2`;
    expect(redirectMock).toHaveBeenCalledWith(
      `/sign-in?redirect=${encodeURIComponent(expectedBookingPath)}`,
    );
  });

  it('renders normally, with no redirect, when signed in', async () => {
    const ui = await BookListingPage({
      params: Promise.resolve({ id: MOCK_LISTING.id }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: MOCK_LISTING.title })).toBeInTheDocument();
  });

  it('renders the listing summary: title, city/country, price and capacity', async () => {
    const ui = await BookListingPage({
      params: Promise.resolve({ id: MOCK_LISTING.id }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(screen.getByRole('heading', { name: MOCK_LISTING.title })).toBeInTheDocument();
    expect(screen.getByText('Lisbon, Portugal')).toBeInTheDocument();
    expect(screen.getByText(/82 EUR/)).toBeInTheDocument();
    expect(screen.getByText(/Sleeps up to 4 guests/)).toBeInTheDocument();
  });

  it('calls notFound when the listing does not exist', async () => {
    vi.mocked(fetchListing).mockResolvedValue(null);

    await expect(
      BookListingPage({
        params: Promise.resolve({ id: 'unknown-id' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow();

    expect(notFoundMock).toHaveBeenCalled();
  });

  it('passes no carried-forward dates/guests to the form when none are in the URL', async () => {
    const ui = await BookListingPage({
      params: Promise.resolve({ id: MOCK_LISTING.id }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    const props = JSON.parse(screen.getByTestId('booking-form').textContent!);
    expect(props).toMatchObject({ listingId: MOCK_LISTING.id, maxGuests: 4 });
    expect(props.checkIn).toBeUndefined();
    expect(props.checkOut).toBeUndefined();
    expect(props.guests).toBeUndefined();
  });

  it('shows dates, nights and total price, and carries them to the form, when supplied together', async () => {
    vi.mocked(fetchListing).mockResolvedValue({
      ...MOCK_LISTING,
      availability: {
        checkIn: '2026-08-05',
        checkOut: '2026-08-10',
        available: true,
        nights: 5,
        totalPrice: 410,
      },
    });

    const ui = await BookListingPage({
      params: Promise.resolve({ id: MOCK_LISTING.id }),
      searchParams: Promise.resolve({ checkIn: '2026-08-05', checkOut: '2026-08-10' }),
    });
    render(ui);

    expect(screen.getByTestId('stay-summary')).toHaveTextContent(
      '2026-08-05 – 2026-08-10 · 5 nights · 410 EUR total',
    );

    const props = JSON.parse(screen.getByTestId('booking-form').textContent!);
    expect(props.checkIn).toBe('2026-08-05');
    expect(props.checkOut).toBe('2026-08-10');
  });

  it('does not carry a lone in-progress date through to fetchListing or the form', async () => {
    const ui = await BookListingPage({
      params: Promise.resolve({ id: MOCK_LISTING.id }),
      searchParams: Promise.resolve({ checkIn: '2026-08-05' }),
    });
    render(ui);

    expect(fetchListing).toHaveBeenCalledWith(MOCK_LISTING.id, undefined);
    const props = JSON.parse(screen.getByTestId('booking-form').textContent!);
    expect(props.checkIn).toBeUndefined();
  });

  it('carries a valid carried-forward guest count to the form', async () => {
    const ui = await BookListingPage({
      params: Promise.resolve({ id: MOCK_LISTING.id }),
      searchParams: Promise.resolve({ guests: '2' }),
    });
    render(ui);

    const props = JSON.parse(screen.getByTestId('booking-form').textContent!);
    expect(props.guests).toBe(2);
  });

  it("does not carry a guest count over the listing's maxGuests", async () => {
    const ui = await BookListingPage({
      params: Promise.resolve({ id: MOCK_LISTING.id }),
      searchParams: Promise.resolve({ guests: '99' }),
    });
    render(ui);

    const props = JSON.parse(screen.getByTestId('booking-form').textContent!);
    expect(props.guests).toBeUndefined();
  });
});

describe('generateMetadata', () => {
  it('titles the page after the listing', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ id: MOCK_LISTING.id }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.title).toBe(`Book ${MOCK_LISTING.title}`);
  });

  it('calls notFound when the listing does not exist', async () => {
    vi.mocked(fetchListing).mockResolvedValue(null);

    await expect(
      generateMetadata({
        params: Promise.resolve({ id: 'unknown-id' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow();

    expect(notFoundMock).toHaveBeenCalled();
  });

  it('fetches with the same dates as the page, so Next.js can dedupe the two calls into one request', async () => {
    await generateMetadata({
      params: Promise.resolve({ id: MOCK_LISTING.id }),
      searchParams: Promise.resolve({ checkIn: '2026-08-05', checkOut: '2026-08-10' }),
    });

    expect(fetchListing).toHaveBeenCalledWith(MOCK_LISTING.id, {
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
    });
  });
});
