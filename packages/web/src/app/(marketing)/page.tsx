import type { CityCentroid } from '@travel-booking/core';
import { Suspense } from 'react';
import { DealsSection, type Deal } from '@/app/_components/DealsSection';
import { DealsSkeleton } from '@/app/_components/DealsSkeleton';
import { displayFont } from '@/app/_components/fonts';
import { HeroSearchForm } from '@/app/_components/HeroSearchForm';
import { TileDivider } from '@/app/_components/TileDivider';
import { TileMark } from '@/app/_components/TileMark';
import { fetchCities, fetchSearchResults } from '@/lib/api';

// One listing per destination city, so "Deals on offer" reflects the actual
// inventory rather than a fabricated discount — this app's search results
// carry no discount field, so a "% off" badge here would be made up.
const DEAL_RADIUS_KM = 25;

async function fetchDeals(cities: CityCentroid[]): Promise<Deal[]> {
  const perCity = await Promise.all(
    cities.map(async (city): Promise<Deal | null> => {
      const response = await fetchSearchResults({
        lat: city.coordinates.latitude,
        lng: city.coordinates.longitude,
        radiusKm: DEAL_RADIUS_KM,
        country: city.country,
        page: 1,
        size: 1,
      });
      const listing = response.results[0];
      const image = listing?.images[0];
      if (!listing || !image) return null;

      return {
        id: listing.id,
        title: listing.title,
        image,
        price: listing.price,
        currency: listing.currency,
        city: city.city,
        country: city.country,
      };
    }),
  );

  return perCity.filter((deal): deal is Deal => deal !== null);
}

export default async function HomePage() {
  const cities = await fetchCities();

  // Not awaited here: the request starts immediately, but resolving it is
  // deferred to the Suspense boundary below so the header/hero/search form
  // (which only need `cities`) aren't blocked on the deals fetch's four
  // parallel search calls — mirrors Search's resultsPromise.
  const dealsPromise = fetchDeals(cities);

  return (
    <main className="flex flex-1 flex-col bg-limestone">
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-azulejo to-azulejo-light px-6 pt-14 pb-24 text-white sm:pt-20 sm:pb-28">
        <TileMark className="pointer-events-none absolute -top-10 -right-10 size-64 text-white/10 sm:size-96" />
        <div className="motion-safe:animate-[rise-in_0.7s_ease-out] relative mx-auto flex max-w-4xl flex-col items-start gap-6 text-left">
          <h1
            className={`${displayFont.className} text-4xl leading-[1.05] font-semibold text-balance sm:text-5xl lg:text-6xl`}
          >
            Rooftops in Lisbon. Hillsides in Sintra. Mornings in Paris.
          </h1>
          <p className="max-w-xl text-lg text-white/80">
            Search real stays across Lisbon, Cascais, Sintra and Paris, and book direct in minutes.
          </p>
        </div>
        <div className="motion-safe:animate-[rise-in_0.9s_ease-out] relative mx-auto mt-10 max-w-5xl">
          <HeroSearchForm cities={cities} />
        </div>
        <TileDivider />
      </section>

      <Suspense fallback={<DealsSkeleton />}>
        <DealsSection dealsPromise={dealsPromise} />
      </Suspense>
    </main>
  );
}
