import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { displayFont } from '@/app/_components/fonts';
import { EmptyState } from '@/app/search/_components/EmptyState';
import { SearchResults } from '@/app/search/_components/SearchResults';
import { Button } from '@/components/ui/button';
import { fetchCities, fetchSearchResults } from '@/lib/api';
import { searchHref, slugify } from '@/lib/utils';

// Same defaults /search uses for its own unfiltered view (ADR-0007) — this
// page renders only that default, unfiltered page 1, never reading
// searchParams itself.
const DEFAULT_RADIUS_KM = 25;
const PAGE_SIZE = 12;

// Time-based ISR only (ADR-0007) — no on-demand revalidation wired to
// Listing changes.
export const revalidate = 3600;

type CityStaysPageProps = {
  params: Promise<{ city: string }>;
};

// Shared by the page and generateMetadata below so both resolve the same
// slug -> city match without duplicating the fetchCities + slugify lookup.
// A city added since the last build/revalidation still matches here, since
// this always re-fetches rather than trusting the build-time param set.
async function findCity(slug: string) {
  const cities = await fetchCities();
  return cities.find((city) => slugify(city.city) === slug) ?? null;
}

// No try/catch here: if fetchCities() throws, that should fail `next build`
// outright rather than silently shipping zero pre-rendered cities (ADR-0007).
export async function generateStaticParams() {
  const cities = await fetchCities();
  return cities.map((city) => ({ city: slugify(city.city) }));
}

export async function generateMetadata({ params }: CityStaysPageProps): Promise<Metadata> {
  const { city: slug } = await params;
  const city = await findCity(slug);
  if (!city) {
    notFound();
  }

  return {
    title: `Stays in ${city.city}, ${city.country} | Travel Booking`,
    description: `Browse stays in ${city.city}, ${city.country} on Travel Booking.`,
  };
}

export default async function CityStaysPage({ params }: CityStaysPageProps) {
  const { city: slug } = await params;
  const city = await findCity(slug);
  if (!city) {
    notFound();
  }

  const { results } = await fetchSearchResults({
    lat: city.coordinates.latitude,
    lng: city.coordinates.longitude,
    radiusKm: DEFAULT_RADIUS_KM,
    country: city.country,
    page: 1,
    size: PAGE_SIZE,
  });

  return (
    <main className="flex flex-1 flex-col bg-limestone">
      <div className="motion-safe:animate-[rise-in_0.5s_ease-out] border-b border-azulejo/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs tracking-wide text-azulejo/60 uppercase">Stays</p>
            <h1
              className={`${displayFont.className} text-2xl font-semibold text-azulejo sm:text-3xl`}
            >
              Stays in {city.city}, {city.country}
            </h1>
          </div>
          <Button
            asChild
            className="bg-terracotta text-white hover:bg-terracotta/90 focus-visible:ring-terracotta/40"
          >
            <Link href={searchHref({ city: { city: city.city, country: city.country } })}>
              Search stays in {city.city}
            </Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        {results.length === 0 ? <EmptyState /> : <SearchResults results={results} />}
      </div>
    </main>
  );
}
