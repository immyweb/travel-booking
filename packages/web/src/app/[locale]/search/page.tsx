import { AmenitySchema, type Amenity, type CityCentroid } from '@travel-booking/core';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { displayFont } from '@/app/_components/fonts';
import { languageAlternates } from '@/i18n/metadata';
import { DEFAULT_RADIUS_KM, fetchCities, fetchSearchResults, PAGE_SIZE } from '@/lib/api';
import { slugify } from '@/lib/utils';
import { AmenitiesFilter } from './_components/AmenitiesFilter';
import { CityPicker } from './_components/CityPicker';
import { DateRangeFilter } from './_components/DateRangeFilter';
import { GuestCountFilter } from './_components/GuestCountFilter';
import { ResultsSkeleton } from './_components/ResultsSkeleton';
import { SearchResultsSection } from './_components/SearchResultsSection';

function isAmenity(value: string): value is Amenity {
  return AmenitySchema.safeParse(value).success;
}

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

// A malformed or absent `page` falls back to page 1, same as the guest count
// below — shared by the page component and generateMetadata so both agree on
// what "page 1" means.
function resolvePage(pageParam: string | undefined): number {
  const requestedPage = Number(pageParam);
  return requestedPage > 0 ? requestedPage : 1;
}

// Shared by the page component and generateMetadata so both resolve the same
// city — an unmatched or absent city/country param falls back to the first
// city the same way in both, mirroring /[city]/stays' own findCity.
function findSelectedCity(
  params: { city?: string; country?: string },
  cities: CityCentroid[],
): CityCentroid | undefined {
  return (
    cities.find((city) => city.city === params.city && city.country === params.country) ?? cities[0]
  );
}

// /search's unfiltered, page-1 view of a city renders near-identical content
// to that city's /[city]/stays page (ADR-0007) — this is true only when
// checkIn/checkOut/guests/amenities are all absent, since any of those makes
// for legitimately distinct, independently indexable results. Presence, not
// validity, is what's checked here: even a malformed filter value means this
// isn't the plain default view.
function isDefaultCityView(params: Awaited<SearchPageProps['searchParams']>): boolean {
  if (params.checkIn || params.checkOut || params.guests || params.amenities) {
    return false;
  }
  return resolvePage(params.page) === 1;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const [params, cities] = await Promise.all([searchParams, fetchCities()]);
  const selectedCity = findSelectedCity(params, cities);

  if (!selectedCity) {
    return {};
  }

  // The default, unfiltered page-1 view of a city canonicalizes to that
  // city's own /[city]/stays page (ADR-0007) — its hreflang alternates are
  // that same target's, not /search's own. Any filtered/paginated view is
  // its own distinct, independently indexable page, so its alternates carry
  // the query string forward too (dropping only `page` beyond page 1 would
  // be a further optimization, not required for reciprocal correctness).
  if (isDefaultCityView(params)) {
    const citySlug = slugify(selectedCity.city);
    return {
      alternates: {
        canonical: `/${citySlug}/stays`,
        languages: languageAlternates(`/${citySlug}/stays`),
      },
    };
  }

  const query: Record<string, string | string[]> = {
    city: selectedCity.city,
    country: selectedCity.country,
  };
  if (params.checkIn) query.checkIn = params.checkIn;
  if (params.checkOut) query.checkOut = params.checkOut;
  if (params.guests) query.guests = params.guests;
  if (params.amenities) query.amenities = params.amenities;
  if (params.page) query.page = params.page;

  return {
    alternates: {
      languages: languageAlternates({ pathname: '/search', query }),
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const [params, cities, t] = await Promise.all([
    searchParams,
    fetchCities(),
    getTranslations('SearchPage'),
  ]);
  const selectedCity = findSelectedCity(params, cities);

  if (!selectedCity) {
    return (
      <main className="flex flex-1 items-center justify-center bg-limestone p-8">
        <p className="text-muted-foreground">{t('noDestinations')}</p>
      </main>
    );
  }

  const page = resolvePage(params.page);

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
    <main className="flex flex-1 flex-col bg-limestone">
      <div className="motion-safe:animate-[rise-in_0.5s_ease-out] border-b border-azulejo/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs tracking-wide text-azulejo/70 uppercase">
              {t('resultsEyebrow')}
            </p>
            <h1
              className={`${displayFont.className} text-2xl font-semibold text-azulejo sm:text-3xl`}
            >
              {t('staysInCity', { city: selectedCity.city, country: selectedCity.country })}
            </h1>
          </div>
          <div className="flex flex-wrap items-end gap-3">
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
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 py-8">
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
      </div>
    </main>
  );
}
