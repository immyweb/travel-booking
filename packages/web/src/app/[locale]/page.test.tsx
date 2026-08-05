import type { SearchResponse } from '@travel-booking/core';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { messages, renderWithIntl as render } from '@/test-support/renderWithIntl';
import { server } from '@/mocks/server';
import HomePage from './page';

const homePage = messages.HomePage;
const heroSearchForm = messages.HeroSearchForm;
const dealsSection = messages.DealsSection;
const destinationsSection = messages.DestinationsSection;

// Partial mock, not a full replacement: '@/i18n/navigation''s createNavigation
// call needs the rest of the real module (redirect, etc.) at import time.
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ push: vi.fn() }),
}));

// The Next.js font loader transform only runs inside Next's own build, not
// under Vitest, so next/font/google resolves to no usable export here.
vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ className: 'font-display-mock' }),
}));

const API_URL = 'http://localhost:4000';

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
  // fetchDeals fans out one fetchSearchResults call per city from
  // fetchCities' default handler (Lisbon, Paris) — branch on the country
  // query param the same way the previous per-country mockImplementation did.
  server.use(
    http.get(`${API_URL}/search`, ({ request }) => {
      const country = new URL(request.url).searchParams.get('country');
      if (country === 'France') {
        return HttpResponse.json(searchResponseFor('listing-paris', 'Le Marais loft'));
      }
      return HttpResponse.json(searchResponseFor('listing-lisbon', 'Sunny Alfama studio'));
    }),
  );
});

describe('HomePage', () => {
  it('renders the hero heading and a search form', async () => {
    const ui = await HomePage();
    render(ui);

    expect(screen.getByRole('heading', { name: homePage.heroTitle, level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(heroSearchForm.whereTo)).toBeInTheDocument();
  });

  it('links each destination tile to its pre-generated /[city]/stays page', async () => {
    const ui = await HomePage();
    render(ui);

    expect(
      screen.getByRole('link', {
        name: new RegExp(`Lisbon.*${destinationsSection.browseStays}`, 's'),
      }),
    ).toHaveAttribute('href', '/lisbon/stays');
    expect(
      screen.getByRole('link', {
        name: new RegExp(`Paris.*${destinationsSection.browseStays}`, 's'),
      }),
    ).toHaveAttribute('href', '/paris/stays');
  });

  it('renders a deal card per destination from real search results', async () => {
    const ui = await HomePage();
    // The deals grid resolves behind a Suspense boundary now, so the render
    // has to be flushed inside an async act() before the resolved content
    // shows up — mirrors Search's own resultsPromise + Suspense test.
    await act(async () => {
      render(ui);
    });

    expect(screen.getByRole('heading', { name: dealsSection.heading })).toBeInTheDocument();
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
