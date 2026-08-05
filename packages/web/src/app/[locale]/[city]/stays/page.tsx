import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { displayFont } from '@/app/_components/fonts';
import { EmptyState } from '@/components/pages/EmptyState';
import { SearchResults } from '@/components/pages/SearchResults';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { languageAlternates } from '@/i18n/metadata';
import { DEFAULT_RADIUS_KM, fetchCities, fetchSearchResults, PAGE_SIZE } from '@/lib/api';
import { cn, searchHref, slugify } from '@/lib/utils';

// This page renders only /search's default, unfiltered page 1 (ADR-0007) —
// no dates/guests/amenities, and no searchParams read here at all. Time-based
// ISR only — no on-demand revalidation wired to Listing changes.
export const revalidate = 3600;

type CityStaysPageProps = {
  params: Promise<{ locale: string; city: string }>;
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
  const { locale, city: slug } = await params;
  const city = await findCity(slug);
  if (!city) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'CityStaysPage' });

  return {
    title: t('metaTitle', { city: city.city, country: city.country }),
    description: t('metaDescription', { city: city.city, country: city.country }),
    alternates: { languages: languageAlternates(`/${slug}/stays`) },
  };
}

export default async function CityStaysPage({ params }: CityStaysPageProps) {
  const { city: slug } = await params;
  const [city, t] = await Promise.all([findCity(slug), getTranslations('CityStaysPage')]);
  if (!city) {
    notFound();
  }

  const { results } = await fetchSearchResults(
    {
      lat: city.coordinates.latitude,
      lng: city.coordinates.longitude,
      radiusKm: DEFAULT_RADIUS_KM,
      country: city.country,
      page: 1,
      size: PAGE_SIZE,
    },
    { revalidate },
  );

  return (
    <main className="flex flex-1 flex-col bg-limestone">
      <div className="motion-safe:animate-[rise-in_0.5s_ease-out] border-b border-azulejo/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs tracking-wide text-azulejo/60 uppercase">
              {t('eyebrow')}
            </p>
            <h1
              className={`${displayFont.className} text-2xl font-semibold text-azulejo sm:text-3xl`}
            >
              {t('staysInCity', { city: city.city, country: city.country })}
            </h1>
          </div>
          <Link
            href={searchHref({ city: { city: city.city, country: city.country } })}
            className={cn(
              buttonVariants({
                className:
                  'bg-terracotta text-white hover:bg-terracotta/90 focus-visible:ring-terracotta/40',
              }),
            )}
          >
            {t('searchStaysInCity', { city: city.city })}
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        {results.length === 0 ? <EmptyState /> : <SearchResults results={results} />}
      </div>
    </main>
  );
}
