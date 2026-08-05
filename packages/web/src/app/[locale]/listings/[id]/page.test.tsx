import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FIXTURE_LISTING } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { messages, renderWithIntl as render, t } from '@/test-support/renderWithIntl';
import ListingDetailPage, { generateMetadata } from './page';

const listingDetailPage = messages.ListingDetailPage;
const amenities = messages.Amenities;

const API_URL = 'http://localhost:4000';

// Mirrors the locale-aware formatting the page now applies (#38) — assertions
// build the expected string the same way rather than hardcoding a format
// that'd drift from next-intl's own currency/date style.
function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(price);
}
function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(iso));
}

const notFoundMock = vi.fn(() => {
  // Mirrors next/navigation's real notFound(), which throws to halt
  // rendering — callers rely on this to short-circuit past a null listing.
  throw new Error('NEXT_NOT_FOUND');
});
// Partial mock, not a full replacement: '@/i18n/navigation''s createNavigation
// call needs the rest of the real module (redirect, etc.) at import time.
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  notFound: () => notFoundMock(),
}));

// The Next.js font loader transform only runs inside Next's own build, not
// under Vitest, so next/font/google resolves to no usable export here — the
// page now pulls this in indirectly via HomeHeader/HomeFooter's displayFont.
vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ className: 'font-display-mock' }),
}));

beforeEach(() => {
  notFoundMock.mockClear();
});

describe('ListingDetailPage', () => {
  it("renders the listing's title, price, currency, city, country and guest capacity", async () => {
    const ui = await ListingDetailPage({
      params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(screen.getByRole('heading', { name: FIXTURE_LISTING.title })).toBeInTheDocument();
    expect(screen.getByText('Lisbon, Portugal')).toBeInTheDocument();
    expect(screen.getByText(formatPrice(82, 'EUR'), { exact: false })).toBeInTheDocument();
    expect(screen.getByText(t('ListingDetailPage.sleepsUpTo', { count: 4 }))).toBeInTheDocument();
  });

  it('renders the full amenity list using the shared amenity label formatting', async () => {
    const ui = await ListingDetailPage({
      params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(screen.getByText(amenities.wifi)).toBeInTheDocument();
    expect(screen.getByText(amenities.parking)).toBeInTheDocument();
  });

  it('renders one carousel image per photo, each with distinguishing alt text', async () => {
    const ui = await ListingDetailPage({
      params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(screen.getByAltText(`${FIXTURE_LISTING.title} — photo 1 of 2`)).toBeInTheDocument();
    expect(screen.getByAltText(`${FIXTURE_LISTING.title} — photo 2 of 2`)).toBeInTheDocument();
  });

  it('calls notFound when the listing does not exist', async () => {
    server.use(
      http.get(`${API_URL}/listings/:id`, () =>
        HttpResponse.json({ error: { message: 'Listing not found' } }, { status: 404 }),
      ),
    );

    await expect(
      ListingDetailPage({
        params: Promise.resolve({ locale: 'en', id: 'unknown-id' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow();

    expect(notFoundMock).toHaveBeenCalled();
  });

  it('shows no availability section and an enabled Book now when no dates are in the URL', async () => {
    const ui = await ListingDetailPage({
      params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(screen.queryByText(listingDetailPage.notAvailable)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: listingDetailPage.bookNow })).toBeInTheDocument();
  });

  it('shows the dates, nights and total price, and an enabled Book now, when available for the requested dates', async () => {
    server.use(
      http.get(`${API_URL}/listings/:id`, () =>
        HttpResponse.json({
          ...FIXTURE_LISTING,
          availability: {
            checkIn: '2026-08-05',
            checkOut: '2026-08-10',
            available: true,
            nights: 5,
            totalPrice: 410,
          },
        }),
      ),
    );

    const ui = await ListingDetailPage({
      params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
      searchParams: Promise.resolve({ checkIn: '2026-08-05', checkOut: '2026-08-10' }),
    });
    render(ui);

    expect(screen.getByText(formatDate('2026-08-05'), { exact: false })).toBeInTheDocument();
    expect(
      screen.getByText(t('Common.nights', { count: 5 }), { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(t('Common.total', { total: formatPrice(410, 'EUR') })),
    ).toBeInTheDocument();
    const bookLink = screen.getByRole('link', { name: listingDetailPage.bookNow });
    expect(bookLink).toHaveAttribute(
      'href',
      '/listings/listing-1/book?checkIn=2026-08-05&checkOut=2026-08-10',
    );
  });

  it('shows an unavailable message and a disabled Book now when booked for the requested dates', async () => {
    server.use(
      http.get(`${API_URL}/listings/:id`, () =>
        HttpResponse.json({
          ...FIXTURE_LISTING,
          availability: {
            checkIn: '2026-08-05',
            checkOut: '2026-08-10',
            available: false,
            nights: 5,
            totalPrice: 410,
          },
        }),
      ),
    );

    const ui = await ListingDetailPage({
      params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
      searchParams: Promise.resolve({ checkIn: '2026-08-05', checkOut: '2026-08-10' }),
    });
    render(ui);

    expect(screen.getByText(listingDetailPage.notAvailable)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: listingDetailPage.bookNow })).toBeDisabled();
    expect(screen.queryByRole('link', { name: listingDetailPage.bookNow })).not.toBeInTheDocument();
  });
});

describe('generateMetadata', () => {
  it("sets the page title to the listing's title", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.title).toBe(FIXTURE_LISTING.title);
    expect(metadata.description).toEqual(expect.stringContaining('Lisbon'));
  });

  it('calls notFound when the listing does not exist', async () => {
    server.use(
      http.get(`${API_URL}/listings/:id`, () =>
        HttpResponse.json({ error: { message: 'Listing not found' } }, { status: 404 }),
      ),
    );

    await expect(
      generateMetadata({
        params: Promise.resolve({ locale: 'en', id: 'unknown-id' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow();

    expect(notFoundMock).toHaveBeenCalled();
  });

  it('fetches with the same dates as the page, so Next.js can dedupe the two calls into one request', async () => {
    let requestUrl: URL | undefined;
    server.use(
      http.get(`${API_URL}/listings/:id`, ({ request }) => {
        requestUrl = new URL(request.url);
        return HttpResponse.json(FIXTURE_LISTING);
      }),
    );

    await generateMetadata({
      params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
      searchParams: Promise.resolve({ checkIn: '2026-08-05', checkOut: '2026-08-10' }),
    });

    expect(Object.fromEntries(requestUrl!.searchParams)).toEqual({
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
    });
  });
});
