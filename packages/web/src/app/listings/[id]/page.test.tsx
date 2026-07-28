import type { ListingDetail } from '@travel-booking/core';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchListing } from '@/lib/api';
import ListingDetailPage, { generateMetadata } from './page';

vi.mock('@/lib/api', () => ({
  fetchListing: vi.fn(),
}));

const notFoundMock = vi.fn(() => {
  // Mirrors next/navigation's real notFound(), which throws to halt
  // rendering — callers rely on this to short-circuit past a null listing.
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

beforeEach(() => {
  vi.mocked(fetchListing).mockResolvedValue(MOCK_LISTING);
  notFoundMock.mockClear();
});

describe('ListingDetailPage', () => {
  it("renders the listing's title, price, currency, city, country and guest capacity", async () => {
    const ui = await ListingDetailPage({
      params: Promise.resolve({ id: MOCK_LISTING.id }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(screen.getByRole('heading', { name: MOCK_LISTING.title })).toBeInTheDocument();
    expect(screen.getByText('Lisbon, Portugal')).toBeInTheDocument();
    expect(screen.getByText('82 EUR', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Sleeps up to 4 guests')).toBeInTheDocument();
  });

  it('renders the full amenity list using the shared amenity label formatting', async () => {
    const ui = await ListingDetailPage({
      params: Promise.resolve({ id: MOCK_LISTING.id }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(screen.getByText('Wifi')).toBeInTheDocument();
    expect(screen.getByText('Parking')).toBeInTheDocument();
  });

  it('renders one carousel image per photo, each with distinguishing alt text', async () => {
    const ui = await ListingDetailPage({
      params: Promise.resolve({ id: MOCK_LISTING.id }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(screen.getByAltText(`${MOCK_LISTING.title} — photo 1 of 2`)).toBeInTheDocument();
    expect(screen.getByAltText(`${MOCK_LISTING.title} — photo 2 of 2`)).toBeInTheDocument();
  });

  it('calls notFound when the listing does not exist', async () => {
    vi.mocked(fetchListing).mockResolvedValue(null);

    await expect(
      ListingDetailPage({
        params: Promise.resolve({ id: 'unknown-id' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow();

    expect(notFoundMock).toHaveBeenCalled();
  });

  it('shows no availability section and an enabled Book now when no dates are in the URL', async () => {
    const ui = await ListingDetailPage({
      params: Promise.resolve({ id: MOCK_LISTING.id }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(screen.queryByText('Not available for these dates')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book now' })).toBeInTheDocument();
  });

  it('shows the dates, nights and total price, and an enabled Book now, when available for the requested dates', async () => {
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

    const ui = await ListingDetailPage({
      params: Promise.resolve({ id: MOCK_LISTING.id }),
      searchParams: Promise.resolve({ checkIn: '2026-08-05', checkOut: '2026-08-10' }),
    });
    render(ui);

    expect(screen.getByText('2026-08-05', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('5 nights', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('410 EUR total')).toBeInTheDocument();
    const bookLink = screen.getByRole('link', { name: 'Book now' });
    expect(bookLink).toHaveAttribute(
      'href',
      '/listings/listing-1/book?checkIn=2026-08-05&checkOut=2026-08-10',
    );
  });

  it('shows an unavailable message and a disabled Book now when booked for the requested dates', async () => {
    vi.mocked(fetchListing).mockResolvedValue({
      ...MOCK_LISTING,
      availability: {
        checkIn: '2026-08-05',
        checkOut: '2026-08-10',
        available: false,
        nights: 5,
        totalPrice: 410,
      },
    });

    const ui = await ListingDetailPage({
      params: Promise.resolve({ id: MOCK_LISTING.id }),
      searchParams: Promise.resolve({ checkIn: '2026-08-05', checkOut: '2026-08-10' }),
    });
    render(ui);

    expect(screen.getByText('Not available for these dates')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Book now' })).toBeDisabled();
    expect(screen.queryByRole('link', { name: 'Book now' })).not.toBeInTheDocument();
  });
});

describe('generateMetadata', () => {
  it("sets the page title to the listing's title", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ id: MOCK_LISTING.id }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.title).toBe(MOCK_LISTING.title);
    expect(metadata.description).toEqual(expect.stringContaining('Lisbon'));
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
