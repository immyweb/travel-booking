import type { CityCentroid } from '@travel-booking/core';
import Link from 'next/link';
import { searchHref } from '@/lib/utils';
import { displayFont } from './fonts';
import { TileMark } from './TileMark';

type HomeFooterProps = {
  cities: CityCentroid[];
};

export function HomeFooter({ cities }: HomeFooterProps) {
  return (
    <footer className="bg-azulejo text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 sm:flex-row sm:justify-between">
        <div className="flex max-w-sm flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <TileMark className="size-6 text-gold" />
            <span className={`${displayFont.className} text-lg font-semibold tracking-tight`}>
              Travel Booking
            </span>
          </div>
          <p className="text-sm text-white/70">
            Boutique stays across Portugal and France — booked direct, no faceless marketplace in
            between.
          </p>
        </div>
        {cities.length > 0 && (
          <nav aria-label="Destinations" className="flex flex-col gap-2.5">
            <span className="text-xs font-medium tracking-wide text-white/70 uppercase">
              Destinations
            </span>
            <ul className="flex flex-col gap-1.5">
              {cities.map((city) => (
                <li key={`${city.city}::${city.country}`}>
                  <Link
                    href={searchHref({ city: { city: city.city, country: city.country } })}
                    className="text-sm text-white/80 hover:text-white hover:underline underline-offset-4"
                  >
                    {city.city}, {city.country}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-white/70">
          © {new Date().getFullYear()} Travel Booking
        </div>
      </div>
    </footer>
  );
}
