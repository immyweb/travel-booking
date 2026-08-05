import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FIXTURE_CITIES, FIXTURE_SEARCH_RESPONSE } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithIntl as render } from '@/test-support/renderWithIntl';
import CityStaysPage, { generateMetadata, generateStaticParams } from './page';

const API_URL = 'http://localhost:4000';

const notFoundMock = vi.fn(() => {
  // Mirrors next/navigation's real notFound(), which throws to halt
  // rendering — callers rely on this to short-circuit past an unmatched slug.
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
// page pulls this in indirectly via HomeHeader/HomeFooter's displayFont.
vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ className: 'font-display-mock' }),
}));

beforeEach(() => {
  notFoundMock.mockClear();
});

describe('generateStaticParams', () => {
  it('returns one slugified param per city from fetchCities, diacritics stripped', async () => {
    server.use(
      http.get(`${API_URL}/search/cities`, () =>
        HttpResponse.json({
          cities: [
            ...FIXTURE_CITIES,
            { city: 'São Paulo', country: 'Brazil', coordinates: { latitude: 0, longitude: 0 } },
          ],
        }),
      ),
    );

    const params = await generateStaticParams();

    expect(params).toEqual([{ city: 'lisbon' }, { city: 'paris' }, { city: 'sao-paulo' }]);
  });
});

describe('CityStaysPage', () => {
  it('renders the default, unfiltered results for a slug matching a known city', async () => {
    const ui = await CityStaysPage({ params: Promise.resolve({ locale: 'en', city: 'lisbon' }) });
    render(ui);

    expect(screen.getByText('Lisbon, Portugal', { exact: false })).toBeInTheDocument();
    for (const listing of FIXTURE_SEARCH_RESPONSE.results) {
      expect(screen.getByRole('img', { name: listing.title })).toBeInTheDocument();
    }
  });

  it('links to /search prefilled with the city and country, with no other filter controls', async () => {
    const ui = await CityStaysPage({ params: Promise.resolve({ locale: 'en', city: 'lisbon' }) });
    render(ui);

    expect(screen.getByRole('link', { name: 'Search stays in Lisbon' })).toHaveAttribute(
      'href',
      '/search?city=Lisbon&country=Portugal',
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /pages/i })).not.toBeInTheDocument();
  });

  it('calls notFound for a slug matching no known city', async () => {
    await expect(
      CityStaysPage({ params: Promise.resolve({ locale: 'en', city: 'unknown-city' }) }),
    ).rejects.toThrow();

    expect(notFoundMock).toHaveBeenCalled();
  });

  it('renders a city added since the last build/revalidation (not in the static param set)', async () => {
    server.use(
      http.get(`${API_URL}/search/cities`, () =>
        HttpResponse.json({
          cities: [
            ...FIXTURE_CITIES,
            { city: 'Berlin', country: 'Germany', coordinates: { latitude: 0, longitude: 0 } },
          ],
        }),
      ),
    );

    const ui = await CityStaysPage({ params: Promise.resolve({ locale: 'en', city: 'berlin' }) });
    render(ui);

    expect(screen.getByText('Berlin, Germany', { exact: false })).toBeInTheDocument();
  });
});

describe('generateMetadata', () => {
  it('sets a title and description naming the city for a matched slug', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'en', city: 'lisbon' }) });

    expect(metadata.title).toBe('Stays in Lisbon, Portugal | Travel Booking');
    expect(metadata.description).toEqual(expect.stringContaining('Lisbon'));
  });

  it('calls notFound when the slug matches no known city', async () => {
    await expect(
      generateMetadata({ params: Promise.resolve({ locale: 'en', city: 'unknown-city' }) }),
    ).rejects.toThrow();

    expect(notFoundMock).toHaveBeenCalled();
  });
});
