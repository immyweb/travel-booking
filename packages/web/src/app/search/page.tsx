import { AmenitySchema, type Amenity } from '@travel-booking/core';
import { Suspense } from 'react';
import { fetchCities, fetchSearchResults } from '@/lib/api';
import { AmenitiesFilter } from './_components/AmenitiesFilter';
import { CityPicker } from './_components/CityPicker';
import { DateRangeFilter } from './_components/DateRangeFilter';
import { GuestCountFilter } from './_components/GuestCountFilter';
import { ResultsSkeleton } from './_components/ResultsSkeleton';
import { SearchResultsSection } from './_components/SearchResultsSection';

function isAmenity(value: string): value is Amenity {
  return AmenitySchema.safeParse(value).success;
}

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
    guests?: string;
    amenities?: string | string[];
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

  // Only a positive integer is a meaningful guest count, so a malformed or
  // absent value falls back to no filter rather than being sent as-is.
  const requestedGuests = Number(params.guests);
  const guests =
    params.guests && Number.isInteger(requestedGuests) && requestedGuests > 0
      ? requestedGuests
      : undefined;
  const guestsParam = guests !== undefined ? String(guests) : undefined;

  // Unrecognized values (a stale link, a typo) are dropped rather than sent
  // as-is, mirroring how a malformed guest count falls back to no filter.
  const requestedAmenities = params.amenities
    ? Array.isArray(params.amenities)
      ? params.amenities
      : [params.amenities]
    : [];
  const amenities = requestedAmenities.filter(isAmenity);

  // Not awaited here: the request starts immediately, but resolving it is
  // deferred to the Suspense boundary below so the filter bar isn't blocked
  // on data it doesn't need.
  const resultsPromise = fetchSearchResults({
    lat: selectedCity.coordinates.latitude,
    lng: selectedCity.coordinates.longitude,
    radiusKm: DEFAULT_RADIUS_KM,
    country: selectedCity.country,
    checkIn,
    checkOut,
    guests,
    amenities: amenities.length > 0 ? amenities : undefined,
    page,
    size: PAGE_SIZE,
  });

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <CityPicker
          cities={cities}
          selectedCity={{ city: selectedCity.city, country: selectedCity.country }}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guestsParam}
          amenities={amenities}
        />
        <DateRangeFilter
          city={{ city: selectedCity.city, country: selectedCity.country }}
          checkIn={params.checkIn}
          checkOut={params.checkOut}
          guests={guestsParam}
          amenities={amenities}
        />
        <GuestCountFilter
          city={{ city: selectedCity.city, country: selectedCity.country }}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={params.guests}
          amenities={amenities}
        />
        <AmenitiesFilter
          city={{ city: selectedCity.city, country: selectedCity.country }}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guestsParam}
          amenities={amenities}
        />
      </div>

      <Suspense fallback={<ResultsSkeleton />}>
        <SearchResultsSection
          resultsPromise={resultsPromise}
          city={{ city: selectedCity.city, country: selectedCity.country }}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          amenities={amenities}
        />
      </Suspense>
    </main>
  );
}
