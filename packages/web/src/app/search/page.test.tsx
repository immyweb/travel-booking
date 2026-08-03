import type { CityCentroid, SearchResponse } from '@travel-booking/core';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCities, fetchSearchResults } from '@/lib/api';
import SearchPage from './page';

vi.mock('@/lib/api', () => ({
  fetchCities: vi.fn(),
  fetchSearchResults: vi.fn(),
}));

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

// The Next.js font loader transform only runs inside Next's own build, not
// under Vitest, so next/font/google resolves to no usable export here.
vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ className: 'font-display-mock' }),
}));

// MapLibre GL JS renders to a WebGL <canvas>, which jsdom can't provide —
// stand in with plain DOM elements so pin content/clicks stay assertable.
vi.mock('react-map-gl/maplibre', () => ({
  Map: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Marker: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <div onClick={onClick}>{children}</div>
  ),
}));

const MOCK_CITIES: CityCentroid[] = [
  { city: 'Lisbon', country: 'Portugal', coordinates: { latitude: 38.7169, longitude: -9.1399 } },
  { city: 'Paris', country: 'France', coordinates: { latitude: 48.8566, longitude: 2.3522 } },
];

const MOCK_SEARCH_RESPONSE: SearchResponse = {
  pagination: { page: 1, size: 12, total: 2, totalPages: 1 },
  results: [
    {
      id: 'listing-1',
      title: 'Sunny Alfama studio',
      images: ['https://images.travel-booking.example/1.jpg'],
      price: 82,
      currency: 'EUR',
      coordinates: { latitude: 38.7127, longitude: -9.1288 },
      distanceKm: 1.2,
    },
    {
      id: 'listing-2',
      title: 'Belém riverside loft',
      images: ['https://images.travel-booking.example/2.jpg'],
      price: 118,
      currency: 'EUR',
      coordinates: { latitude: 38.6971, longitude: -9.2033 },
      distanceKm: 3.4,
    },
  ],
};

const EMPTY_SEARCH_RESPONSE: SearchResponse = {
  pagination: { page: 1, size: 12, total: 0, totalPages: 0 },
  results: [],
};

beforeEach(() => {
  vi.mocked(fetchCities).mockResolvedValue(MOCK_CITIES);
  vi.mocked(fetchSearchResults).mockResolvedValue(MOCK_SEARCH_RESPONSE);
  pushMock.mockClear();
});

describe('SearchPage', () => {
  it('renders listing cards and map pins matching the mocked results', async () => {
    const ui = await SearchPage({ searchParams: Promise.resolve({}) });
    // Results resolve behind a Suspense boundary now, so the render has to
    // be flushed inside an async act() before the resolved content shows up.
    await act(async () => {
      render(ui);
    });

    for (const listing of MOCK_SEARCH_RESPONSE.results) {
      expect(screen.getByRole('img', { name: listing.title })).toBeInTheDocument();
      expect(screen.getAllByText(`${listing.price} ${listing.currency}`).length).toBeGreaterThan(0);
    }
  });

  it('links each result to its listing page with no query params when no dates/guests are selected', async () => {
    const ui = await SearchPage({ searchParams: Promise.resolve({}) });
    await act(async () => {
      render(ui);
    });

    expect(screen.getByRole('link', { name: /Sunny Alfama studio/ })).toHaveAttribute(
      'href',
      '/listings/listing-1',
    );
  });

  it("carries the selected dates and guest count into each result's listing link", async () => {
    const ui = await SearchPage({
      searchParams: Promise.resolve({
        city: 'Paris',
        country: 'France',
        checkIn: '2026-08-05',
        checkOut: '2026-08-10',
        guests: '4',
      }),
    });
    await act(async () => {
      render(ui);
    });

    expect(screen.getByRole('link', { name: /Sunny Alfama studio/ })).toHaveAttribute(
      'href',
      '/listings/listing-1?checkIn=2026-08-05&checkOut=2026-08-10&guests=4',
    );
  });

  it('renders the empty state when no listings match', async () => {
    vi.mocked(fetchSearchResults).mockResolvedValue(EMPTY_SEARCH_RESPONSE);

    const ui = await SearchPage({ searchParams: Promise.resolve({}) });
    await act(async () => {
      render(ui);
    });

    expect(screen.getByText('No listings match your search')).toBeInTheDocument();
  });

  it('reflects the city from the URL query params in the picker', async () => {
    const ui = await SearchPage({
      searchParams: Promise.resolve({ city: 'Paris', country: 'France' }),
    });
    render(ui);

    expect(screen.getByRole('combobox', { name: /Where to\?/ })).toHaveTextContent('Paris, France');
  });

  it('updates the URL when a different city is picked', async () => {
    const user = userEvent.setup();
    const ui = await SearchPage({
      searchParams: Promise.resolve({ city: 'Paris', country: 'France' }),
    });
    render(ui);

    await user.click(screen.getByRole('combobox', { name: /Where to\?/ }));
    await user.click(await screen.findByRole('option', { name: 'Lisbon, Portugal' }));

    expect(pushMock).toHaveBeenCalledWith('/search?city=Lisbon&country=Portugal');
  });

  it('preserves the selected date range when a different city is picked', async () => {
    const user = userEvent.setup();
    const ui = await SearchPage({
      searchParams: Promise.resolve({
        city: 'Paris',
        country: 'France',
        checkIn: '2026-08-05',
        checkOut: '2026-08-10',
      }),
    });
    render(ui);

    await user.click(screen.getByRole('combobox', { name: /Where to\?/ }));
    await user.click(await screen.findByRole('option', { name: 'Lisbon, Portugal' }));

    expect(pushMock).toHaveBeenCalledWith(
      '/search?city=Lisbon&country=Portugal&checkIn=2026-08-05&checkOut=2026-08-10',
    );
  });

  it('reflects check-in/check-out dates from the URL in the date inputs', async () => {
    const ui = await SearchPage({
      searchParams: Promise.resolve({
        city: 'Paris',
        country: 'France',
        checkIn: '2026-08-05',
        checkOut: '2026-08-10',
      }),
    });
    render(ui);

    expect(screen.getByLabelText('Check-in')).toHaveValue('2026-08-05');
    expect(screen.getByLabelText('Check-out')).toHaveValue('2026-08-10');
  });

  it('updates the URL with the new check-in date, preserving the selected city', async () => {
    const ui = await SearchPage({
      searchParams: Promise.resolve({ city: 'Paris', country: 'France' }),
    });
    render(ui);

    fireEvent.change(screen.getByLabelText('Check-in'), { target: { value: '2026-08-05' } });

    expect(pushMock).toHaveBeenCalledWith('/search?city=Paris&country=France&checkIn=2026-08-05');
  });

  it('updates the URL with the new check-out date, preserving check-in and the selected city', async () => {
    const ui = await SearchPage({
      searchParams: Promise.resolve({
        city: 'Paris',
        country: 'France',
        checkIn: '2026-08-05',
      }),
    });
    render(ui);

    fireEvent.change(screen.getByLabelText('Check-out'), { target: { value: '2026-08-10' } });

    expect(pushMock).toHaveBeenCalledWith(
      '/search?city=Paris&country=France&checkIn=2026-08-05&checkOut=2026-08-10',
    );
  });

  it('reflects the guest count from the URL in the guests input', async () => {
    const ui = await SearchPage({
      searchParams: Promise.resolve({ city: 'Paris', country: 'France', guests: '4' }),
    });
    render(ui);

    expect(screen.getByLabelText('Guests')).toHaveValue(4);
  });

  it('updates the URL with the new guest count, preserving the selected city', async () => {
    const ui = await SearchPage({
      searchParams: Promise.resolve({ city: 'Paris', country: 'France' }),
    });
    render(ui);

    fireEvent.change(screen.getByLabelText('Guests'), { target: { value: '3' } });

    expect(pushMock).toHaveBeenCalledWith('/search?city=Paris&country=France&guests=3');
  });

  it('preserves the guest count when a different city is picked', async () => {
    const user = userEvent.setup();
    const ui = await SearchPage({
      searchParams: Promise.resolve({ city: 'Paris', country: 'France', guests: '4' }),
    });
    render(ui);

    await user.click(screen.getByRole('combobox', { name: /Where to\?/ }));
    await user.click(await screen.findByRole('option', { name: 'Lisbon, Portugal' }));

    expect(pushMock).toHaveBeenCalledWith('/search?city=Lisbon&country=Portugal&guests=4');
  });

  it('preserves the guest count when a check-in date is picked', async () => {
    const ui = await SearchPage({
      searchParams: Promise.resolve({ city: 'Paris', country: 'France', guests: '4' }),
    });
    render(ui);

    fireEvent.change(screen.getByLabelText('Check-in'), { target: { value: '2026-08-05' } });

    expect(pushMock).toHaveBeenCalledWith(
      '/search?city=Paris&country=France&checkIn=2026-08-05&guests=4',
    );
  });

  it('reflects the selected amenities from the URL in the amenity dropdown', async () => {
    const user = userEvent.setup();
    const ui = await SearchPage({
      searchParams: Promise.resolve({
        city: 'Paris',
        country: 'France',
        amenities: ['wifi', 'parking'],
      }),
    });
    render(ui);

    await user.click(screen.getByRole('button', { name: 'Amenities (2)' }));

    expect(screen.getByRole('menuitemcheckbox', { name: 'Wifi' })).toBeChecked();
    expect(screen.getByRole('menuitemcheckbox', { name: 'Parking' })).toBeChecked();
    expect(screen.getByRole('menuitemcheckbox', { name: 'Pool' })).not.toBeChecked();
  });

  it('updates the URL with the new amenity, preserving the selected city', async () => {
    const user = userEvent.setup();
    const ui = await SearchPage({
      searchParams: Promise.resolve({ city: 'Paris', country: 'France' }),
    });
    render(ui);

    await user.click(screen.getByRole('button', { name: 'Amenities' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Wifi' }));

    expect(pushMock).toHaveBeenCalledWith('/search?city=Paris&country=France&amenities=wifi');
  });

  it('removes only the unchecked amenity from the URL, preserving the others selected', async () => {
    const user = userEvent.setup();
    const ui = await SearchPage({
      searchParams: Promise.resolve({
        city: 'Paris',
        country: 'France',
        amenities: ['wifi', 'parking'],
      }),
    });
    render(ui);

    await user.click(screen.getByRole('button', { name: 'Amenities (2)' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Wifi' }));

    expect(pushMock).toHaveBeenCalledWith('/search?city=Paris&country=France&amenities=parking');
  });

  it('preserves the selected amenities when a different city is picked', async () => {
    const user = userEvent.setup();
    const ui = await SearchPage({
      searchParams: Promise.resolve({ city: 'Paris', country: 'France', amenities: 'wifi' }),
    });
    render(ui);

    await user.click(screen.getByRole('combobox', { name: /Where to\?/ }));
    await user.click(await screen.findByRole('option', { name: 'Lisbon, Portugal' }));

    expect(pushMock).toHaveBeenCalledWith('/search?city=Lisbon&country=Portugal&amenities=wifi');
  });

  it('preserves the selected amenities when a check-in date is picked', async () => {
    const ui = await SearchPage({
      searchParams: Promise.resolve({ city: 'Paris', country: 'France', amenities: 'wifi' }),
    });
    render(ui);

    fireEvent.change(screen.getByLabelText('Check-in'), { target: { value: '2026-08-05' } });

    expect(pushMock).toHaveBeenCalledWith(
      '/search?city=Paris&country=France&checkIn=2026-08-05&amenities=wifi',
    );
  });
});

describe('SearchPage — search results map', () => {
  beforeEach(() => {
    // useIsDesktop reads this on mount; only rendered here, so the map (and
    // its code-split bundle) mounts only in these desktop-viewport tests.
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(min-width: 768px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a pin for each result, alongside its list row', async () => {
    const ui = await SearchPage({ searchParams: Promise.resolve({}) });
    await act(async () => {
      render(ui);
    });

    const map = within(await screen.findByTestId('search-results-map'));
    for (const listing of MOCK_SEARCH_RESPONSE.results) {
      expect(await map.findByText(`${listing.price} ${listing.currency}`)).toBeInTheDocument();
    }
  });

  it('opens the listing in a new tab when its pin is clicked, like its list row', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const user = userEvent.setup();
    const ui = await SearchPage({ searchParams: Promise.resolve({}) });
    await act(async () => {
      render(ui);
    });

    const map = within(await screen.findByTestId('search-results-map'));
    await user.click(await map.findByText('82 EUR'));

    expect(openSpy).toHaveBeenCalledWith('/listings/listing-1', '_blank', 'noopener,noreferrer');
  });
});
