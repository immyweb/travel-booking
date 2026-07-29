import type { CityCentroid, SearchResponse } from '@travel-booking/core';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCities, fetchSearchResults } from '@/lib/api';
import HomePage from './page';

vi.mock('@/lib/api', () => ({
  fetchCities: vi.fn(),
  fetchSearchResults: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// The Next.js font loader transform only runs inside Next's own build, not
// under Vitest, so next/font/google resolves to no usable export here.
vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ className: 'font-display-mock' }),
}));

const MOCK_CITIES: CityCentroid[] = [
  { city: 'Lisbon', country: 'Portugal', coordinates: { latitude: 38.7169, longitude: -9.1399 } },
  { city: 'Paris', country: 'France', coordinates: { latitude: 48.8566, longitude: 2.3522 } },
];

function searchResponseFor(id: string, title: string): SearchResponse {
  return {
    pagination: { page: 1, size: 1, total: 1, totalPages: 1 },
    results: [
      {
        id,
        title,
        images: ['https://picsum.photos/seed/mock/1200/800'],
        price: 82,
        currency: 'EUR',
        coordinates: { latitude: 38.7127, longitude: -9.1288 },
        distanceKm: 1.2,
      },
    ],
  };
}

beforeEach(() => {
  vi.mocked(fetchCities).mockResolvedValue(MOCK_CITIES);
  vi.mocked(fetchSearchResults).mockImplementation(async (query) => {
    if (query.country === 'France') return searchResponseFor('listing-paris', 'Le Marais loft');
    return searchResponseFor('listing-lisbon', 'Sunny Alfama studio');
  });
});

describe('HomePage', () => {
  it('renders the hero heading and a search form', async () => {
    const ui = await HomePage();
    render(ui);

    expect(
      screen.getByRole('heading', { name: /Rooftops in Lisbon/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Where to?')).toBeInTheDocument();
  });

  it('renders a deal card per destination from real search results', async () => {
    const ui = await HomePage();
    // The deals grid resolves behind a Suspense boundary now, so the render
    // has to be flushed inside an async act() before the resolved content
    // shows up — mirrors Search's own resultsPromise + Suspense test.
    await act(async () => {
      render(ui);
    });

    expect(screen.getByRole('heading', { name: 'Deals on offer' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sunny Alfama studio/ })).toHaveAttribute(
      'href',
      '/listings/listing-lisbon',
    );
    expect(screen.getByRole('link', { name: /Le Marais loft/ })).toHaveAttribute(
      'href',
      '/listings/listing-paris',
    );
  });
});
