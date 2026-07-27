import Link from 'next/link';
import { fetchCities, fetchSearchResults } from '@/lib/api';
import { CityPicker } from './_components/CityPicker';
import { DateRangeFilter } from './_components/DateRangeFilter';
import { EmptyState } from './_components/EmptyState';
import { SearchResults } from './_components/SearchResults';

// No radius-adjustment UI for v1 — a fixed default keeps the "Where to?"
// city picker as the only location control.
const DEFAULT_RADIUS_KM = 25;
const PAGE_SIZE = 12;

type SearchPageProps = {
  searchParams: Promise<{
    city?: string;
    country?: string;
    checkIn?: string;
    checkOut?: string;
    page?: string;
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const cities = await fetchCities();

  const selectedCity =
    cities.find((city) => city.city === params.city && city.country === params.country) ??
    cities[0];

  if (!selectedCity) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">No destinations available yet.</p>
      </main>
    );
  }

  const requestedPage = Number(params.page);
  const page = requestedPage > 0 ? requestedPage : 1;

  // Dates are only meaningful (and only valid per the API's Zod schema) when
  // supplied together, so a lone in-progress selection doesn't get sent as a
  // filter and doesn't 400 the search.
  const hasDateRange = Boolean(params.checkIn && params.checkOut);
  const checkIn = hasDateRange ? params.checkIn : undefined;
  const checkOut = hasDateRange ? params.checkOut : undefined;

  const { pagination, results } = await fetchSearchResults({
    lat: selectedCity.coordinates.latitude,
    lng: selectedCity.coordinates.longitude,
    radiusKm: DEFAULT_RADIUS_KM,
    country: selectedCity.country,
    checkIn,
    checkOut,
    page,
    size: PAGE_SIZE,
  });

  const pageHref = (targetPage: number) =>
    `/search?${new URLSearchParams({
      city: selectedCity.city,
      country: selectedCity.country,
      ...(checkIn && checkOut ? { checkIn, checkOut } : {}),
      page: String(targetPage),
    }).toString()}`;

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <CityPicker
          cities={cities}
          selectedCity={{ city: selectedCity.city, country: selectedCity.country }}
          checkIn={checkIn}
          checkOut={checkOut}
        />
        <DateRangeFilter
          city={{ city: selectedCity.city, country: selectedCity.country }}
          checkIn={params.checkIn}
          checkOut={params.checkOut}
        />
      </div>

      {results.length === 0 ? <EmptyState /> : <SearchResults results={results} />}

      {pagination.totalPages > 1 && (
        <nav
          aria-label="Search results pages"
          className="flex items-center justify-center gap-4 border-t border-border p-4 text-sm"
        >
          {pagination.page > 1 ? (
            <Link href={pageHref(pagination.page - 1)}>Previous</Link>
          ) : (
            <span className="text-muted-foreground">Previous</span>
          )}
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          {pagination.page < pagination.totalPages ? (
            <Link href={pageHref(pagination.page + 1)}>Next</Link>
          ) : (
            <span className="text-muted-foreground">Next</span>
          )}
        </nav>
      )}
    </main>
  );
}
