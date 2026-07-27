import type { CityCentroid, SearchResponse } from '@travel-booking/core';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    render(ui);

    for (const listing of MOCK_SEARCH_RESPONSE.results) {
      expect(screen.getByRole('img', { name: listing.title })).toBeInTheDocument();
      expect(screen.getAllByText(`${listing.price} ${listing.currency}`).length).toBeGreaterThan(0);
    }
  });

  it('renders the empty state when no listings match', async () => {
    vi.mocked(fetchSearchResults).mockResolvedValue(EMPTY_SEARCH_RESPONSE);

    const ui = await SearchPage({ searchParams: Promise.resolve({}) });
    render(ui);

    expect(screen.getByText('No listings match your search')).toBeInTheDocument();
  });

  it('reflects the city from the URL query params in the picker', async () => {
    const ui = await SearchPage({
      searchParams: Promise.resolve({ city: 'Paris', country: 'France' }),
    });
    render(ui);

    expect(screen.getByRole('combobox', { name: 'Where to?' })).toHaveTextContent('Paris, France');
  });

  it('updates the URL when a different city is picked', async () => {
    const user = userEvent.setup();
    const ui = await SearchPage({
      searchParams: Promise.resolve({ city: 'Paris', country: 'France' }),
    });
    render(ui);

    await user.click(screen.getByRole('combobox', { name: 'Where to?' }));
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

    await user.click(screen.getByRole('combobox', { name: 'Where to?' }));
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

    await user.click(screen.getByRole('combobox', { name: 'Where to?' }));
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

  it('reflects the selected amenities from the URL in the amenity checkboxes', async () => {
    const ui = await SearchPage({
      searchParams: Promise.resolve({
        city: 'Paris',
        country: 'France',
        amenities: ['wifi', 'parking'],
      }),
    });
    render(ui);

    expect(screen.getByRole('checkbox', { name: 'Wifi' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Parking' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Pool' })).not.toBeChecked();
  });

  it('updates the URL with the new amenity, preserving the selected city', async () => {
    const user = userEvent.setup();
    const ui = await SearchPage({
      searchParams: Promise.resolve({ city: 'Paris', country: 'France' }),
    });
    render(ui);

    await user.click(screen.getByRole('checkbox', { name: 'Wifi' }));

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

    await user.click(screen.getByRole('checkbox', { name: 'Wifi' }));

    expect(pushMock).toHaveBeenCalledWith('/search?city=Paris&country=France&amenities=parking');
  });

  it('preserves the selected amenities when a different city is picked', async () => {
    const user = userEvent.setup();
    const ui = await SearchPage({
      searchParams: Promise.resolve({ city: 'Paris', country: 'France', amenities: 'wifi' }),
    });
    render(ui);

    await user.click(screen.getByRole('combobox', { name: 'Where to?' }));
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
