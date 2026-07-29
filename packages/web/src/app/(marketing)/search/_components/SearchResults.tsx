'use client';

import type { ListingSummary } from '@travel-booking/core';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { TileMark } from '@/app/_components/TileMark';
import { carryDatesAndGuests } from '@/lib/utils';

type SearchResultsProps = {
  results: ListingSummary[];
  checkIn?: string;
  checkOut?: string;
  guests?: number;
};

type MapPosition = { left: string; top: string };

// Static regardless of props/state (the literal "map tiles" backdrop) —
// hoisted so hovering a listing, which re-renders this component for its
// activeId state, doesn't reconstruct these 60 SVG nodes every time.
const MAP_TILE_TEXTURE = (
  <div className="absolute inset-0 grid grid-cols-10 gap-8 p-4 text-azulejo opacity-[0.07]">
    {Array.from({ length: 60 }, (_, index) => (
      <TileMark key={index} className="size-6" />
    ))}
  </div>
);

// Places listings inside a padded 0-100% box based on their coordinate
// spread — a static stand-in for real map projection/tiles (out of scope
// for v1, see the search-results-display prototype decision).
function placeOnMap(results: ListingSummary[]): Record<string, MapPosition> {
  const lats = results.map((result) => result.coordinates.latitude);
  const lngs = results.map((result) => result.coordinates.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const positions: Record<string, MapPosition> = {};
  for (const result of results) {
    const xRatio = (result.coordinates.longitude - minLng) / (maxLng - minLng || 1);
    const yRatio = (result.coordinates.latitude - minLat) / (maxLat - minLat || 1);
    positions[result.id] = {
      left: `${10 + xRatio * 80}%`,
      top: `${10 + (1 - yRatio) * 80}%`,
    };
  }
  return positions;
}

export function SearchResults({ results, checkIn, checkOut, guests }: SearchResultsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const positions = useMemo(() => placeOnMap(results), [results]);

  // Carries the guest's selected dates/guest count forward from Search so the
  // Listing Detail page can reflect them (same params Search's own filter
  // links already thread through).
  function listingHref(id: string) {
    return `/listings/${id}${carryDatesAndGuests({ checkIn, checkOut, guests })}`;
  }

  return (
    <div className="flex h-[520px] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-azulejo/10 sm:h-[600px]">
      <ol aria-label="Search results" className="w-full space-y-3 overflow-y-auto p-4 md:w-1/2">
        {results.map((listing) => (
          <li
            key={listing.id}
            onMouseEnter={() => setActiveId(listing.id)}
            onMouseLeave={() => setActiveId((id) => (id === listing.id ? null : id))}
          >
            <Link
              href={listingHref(listing.id)}
              target="_blank"
              data-active={activeId === listing.id}
              className="group flex gap-3 rounded-xl p-3 ring-1 ring-azulejo/10 transition hover:bg-limestone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta data-[active=true]:bg-limestone data-[active=true]:ring-2 data-[active=true]:ring-terracotta/60"
            >
              <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {listing.images[0] && (
                  <Image
                    src={listing.images[0]}
                    alt={listing.title}
                    fill
                    sizes="80px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col justify-center gap-0.5">
                <p className="font-mono text-xs text-azulejo/60">
                  {listing.distanceKm.toFixed(1)} km away
                </p>
                <p className="text-sm font-medium text-foreground">{listing.title}</p>
                <p className="font-mono text-sm font-semibold text-azulejo">
                  {listing.price} {listing.currency}{' '}
                  <span className="font-normal text-muted-foreground">/ night</span>
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
      <div
        aria-hidden="true"
        className="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-azulejo-light/10 via-limestone to-gold/10 md:block"
      >
        {MAP_TILE_TEXTURE}
        {results.map((listing) => {
          const position = positions[listing.id];
          if (!position) return null;
          return (
            <div
              key={listing.id}
              style={{ left: position.left, top: position.top }}
              data-active={activeId === listing.id}
              onMouseEnter={() => setActiveId(listing.id)}
              onMouseLeave={() => setActiveId((id) => (id === listing.id ? null : id))}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-terracotta px-2.5 py-1 text-xs font-semibold text-white shadow-md ring-2 ring-white/70 transition data-[active=true]:scale-110"
            >
              {listing.price} {listing.currency}
            </div>
          );
        })}
      </div>
    </div>
  );
}
