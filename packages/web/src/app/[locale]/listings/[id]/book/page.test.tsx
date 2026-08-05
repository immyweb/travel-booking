import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FIXTURE_LISTING } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithIntl as render, t } from '@/test-support/renderWithIntl';
import BookListingPage, { generateMetadata } from './page';

// Mirrors the locale-aware formatting the page now applies (#38) — assertions
// build the expected string the same way rather than hardcoding a format
// that'd drift from next-intl's own currency/date style.
function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(price);
}
function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(iso));
}

const API_URL = 'http://localhost:4000';

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
    guestName?: string;
    guestEmail?: string;
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
// Partial mock, not a full replacement: '@/i18n/navigation''s redirect (which
// the page now calls, not next/navigation's directly) still delegates to
// this underlying next/navigation redirect with the final, locale-resolved
// href — for the 'en' default locale under as-needed prefixing, that's the
// same unprefixed string the page passed in.
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  notFound: () => notFoundMock(),
  redirect: (path: string) => redirectMock(path),
}));

beforeEach(() => {
  notFoundMock.mockClear();
  redirectMock.mockClear();
});

describe('BookListingPage', () => {
  it('redirects to /sign-in with this page as the redirect param when signed out', async () => {
    server.use(http.get(`${API_URL}/api/auth/get-session`, () => HttpResponse.json(null)));
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
      BookListingPage({
        params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectMock).toHaveBeenCalledWith(
      `/sign-in?redirect=${encodeURIComponent(`/listings/${FIXTURE_LISTING.id}/book`)}`,
    );
    expect(fetchListingSpy).not.toHaveBeenCalled();
  });

  it('preserves checkIn/checkOut/guests in the redirect param when signed out', async () => {
    server.use(http.get(`${API_URL}/api/auth/get-session`, () => HttpResponse.json(null)));

    await expect(
      BookListingPage({
        params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
        searchParams: Promise.resolve({
          checkIn: '2026-08-05',
          checkOut: '2026-08-10',
          guests: '2',
        }),
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    const expectedBookingPath = `/listings/${FIXTURE_LISTING.id}/book?checkIn=2026-08-05&checkOut=2026-08-10&guests=2`;
    expect(redirectMock).toHaveBeenCalledWith(
      `/sign-in?redirect=${encodeURIComponent(expectedBookingPath)}`,
    );
  });

  it('renders normally, with no redirect, when signed in', async () => {
    const ui = await BookListingPage({
      params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: FIXTURE_LISTING.title })).toBeInTheDocument();
  });

  it('renders the listing summary: title, city/country, price and capacity', async () => {
    const ui = await BookListingPage({
      params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(screen.getByRole('heading', { name: FIXTURE_LISTING.title })).toBeInTheDocument();
    expect(screen.getByText('Lisbon, Portugal')).toBeInTheDocument();
    expect(
      screen.getByText(
        t('BookListingPage.perNightSleeps', { price: formatPrice(82, 'EUR'), count: 4 }),
      ),
    ).toBeInTheDocument();
  });

  it('calls notFound when the listing does not exist', async () => {
    server.use(
      http.get(`${API_URL}/listings/:id`, () =>
        HttpResponse.json({ error: { message: 'Listing not found' } }, { status: 404 }),
      ),
    );

    await expect(
      BookListingPage({
        params: Promise.resolve({ locale: 'en', id: 'unknown-id' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow();

    expect(notFoundMock).toHaveBeenCalled();
  });

  it('passes no carried-forward dates/guests to the form when none are in the URL', async () => {
    const ui = await BookListingPage({
      params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    const props = JSON.parse(screen.getByTestId('booking-form').textContent!);
    expect(props).toMatchObject({ listingId: FIXTURE_LISTING.id, maxGuests: 4 });
    expect(props.checkIn).toBeUndefined();
    expect(props.checkOut).toBeUndefined();
    expect(props.guests).toBeUndefined();
  });

  it('shows dates, nights and total price, and carries them to the form, when supplied together', async () => {
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

    const ui = await BookListingPage({
      params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
      searchParams: Promise.resolve({ checkIn: '2026-08-05', checkOut: '2026-08-10' }),
    });
    render(ui);

    expect(screen.getByTestId('stay-summary')).toHaveTextContent(
      `${formatDate('2026-08-05')} – ${formatDate('2026-08-10')} · ${t('Common.nights', { count: 5 })} · ${t('Common.total', { total: formatPrice(410, 'EUR') })}`,
    );

    const props = JSON.parse(screen.getByTestId('booking-form').textContent!);
    expect(props.checkIn).toBe('2026-08-05');
    expect(props.checkOut).toBe('2026-08-10');
  });

  it('does not carry a lone in-progress date through to fetchListing or the form', async () => {
    let requestUrl: URL | undefined;
    server.use(
      http.get(`${API_URL}/listings/:id`, ({ request }) => {
        requestUrl = new URL(request.url);
        return HttpResponse.json(FIXTURE_LISTING);
      }),
    );

    const ui = await BookListingPage({
      params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
      searchParams: Promise.resolve({ checkIn: '2026-08-05' }),
    });
    render(ui);

    expect(requestUrl!.search).toBe('');
    const props = JSON.parse(screen.getByTestId('booking-form').textContent!);
    expect(props.checkIn).toBeUndefined();
  });

  it('carries a valid carried-forward guest count to the form', async () => {
    const ui = await BookListingPage({
      params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
      searchParams: Promise.resolve({ guests: '2' }),
    });
    render(ui);

    const props = JSON.parse(screen.getByTestId('booking-form').textContent!);
    expect(props.guests).toBe(2);
  });

  it("does not carry a guest count over the listing's maxGuests", async () => {
    const ui = await BookListingPage({
      params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
      searchParams: Promise.resolve({ guests: '99' }),
    });
    render(ui);

    const props = JSON.parse(screen.getByTestId('booking-form').textContent!);
    expect(props.guests).toBeUndefined();
  });

  it("passes the signed-in User's name and email to the form, to prefill the Guest fields", async () => {
    const ui = await BookListingPage({
      params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    const props = JSON.parse(screen.getByTestId('booking-form').textContent!);
    expect(props.guestName).toBe('Jane Doe');
    expect(props.guestEmail).toBe('jane@example.com');
  });
});

describe('generateMetadata', () => {
  it('titles the page after the listing', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en', id: FIXTURE_LISTING.id }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.title).toBe(t('BookListingPage.metaTitle', { title: FIXTURE_LISTING.title }));
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
