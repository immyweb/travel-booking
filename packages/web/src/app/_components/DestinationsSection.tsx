import type { CityCentroid } from '@travel-booking/core';
import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { slugify } from '@/lib/utils';
import { displayFont } from './fonts';
import { TileMark } from './TileMark';

type DestinationsSectionProps = {
  cities: CityCentroid[];
};

// Each tile's background/text/motif triplet, all four already proven
// AA-safe combinations elsewhere in the app (hero, "Search stays" button) —
// cycled by index so the section reads as a wall of azulejo tiles rather
// than repeating DealsSection's photo-card pattern just below it.
const TILE_STYLES = [
  { bg: 'bg-azulejo', text: 'text-white', motif: 'text-gold/25' },
  { bg: 'bg-terracotta', text: 'text-white', motif: 'text-azulejo-light/30' },
  { bg: 'bg-azulejo-light', text: 'text-white', motif: 'text-terracotta/25' },
  { bg: 'bg-gold', text: 'text-azulejo', motif: 'text-white/40' },
] as const;

export function DestinationsSection({ cities }: DestinationsSectionProps) {
  const t = useTranslations('DestinationsSection');

  if (cities.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
      <div className="mb-8 max-w-xl">
        <h2 className={`${displayFont.className} text-2xl font-semibold text-azulejo sm:text-3xl`}>
          {t('heading')}
        </h2>
        <p className="mt-2 text-muted-foreground">{t('subheading')}</p>
      </div>
      <ul className="grid grid-cols-2 gap-1 overflow-hidden rounded-3xl bg-limestone lg:grid-cols-4">
        {cities.map((city, index) => {
          const style = TILE_STYLES[index % TILE_STYLES.length]!;
          return (
            <li key={`${city.city}-${city.country}`}>
              <Link
                href={`/${slugify(city.city)}/stays`}
                className={`group relative isolate flex aspect-square flex-col justify-between overflow-hidden p-5 transition-transform duration-300 hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset focus-visible:outline-none sm:p-6 ${style.bg} ${style.text}`}
              >
                <TileMark
                  className={`pointer-events-none absolute -right-6 -bottom-6 size-32 rotate-12 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[20deg] ${style.motif}`}
                />
                <span className="relative font-mono text-xs tracking-wide uppercase">
                  {city.country}
                </span>
                <span className="relative">
                  <span className="block text-2xl font-semibold sm:text-3xl">{city.city}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium">
                    {t('browseStays')}
                    <ArrowUpRight
                      className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
