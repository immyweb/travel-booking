'use client';

import type { ListingSummary } from '@travel-booking/core';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

type SearchResultsProps = {
  results: ListingSummary[];
};

type MapPosition = { left: string; top: string };

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

export function SearchResults({ results }: SearchResultsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const positions = useMemo(() => placeOnMap(results), [results]);

  return (
    <div className="flex flex-1 overflow-hidden">
      <ol aria-label="Search results" className="w-full space-y-4 overflow-y-auto p-4 md:w-1/2">
        {results.map((listing) => (
          <li
            key={listing.id}
            onMouseEnter={() => setActiveId(listing.id)}
            onMouseLeave={() => setActiveId((id) => (id === listing.id ? null : id))}
          >
            <Link
              href={`/listings/${listing.id}`}
              target="_blank"
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card
                data-active={activeId === listing.id}
                className="flex-row gap-3 p-3 transition data-[active=true]:ring-foreground/40"
              >
                <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {listing.images[0] && (
                    <Image
                      src={listing.images[0]}
                      alt={listing.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  )}
                </div>
                <CardContent className="flex flex-1 flex-col justify-center gap-0.5 p-0">
                  <p className="text-sm font-medium">{listing.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {listing.distanceKm.toFixed(1)} km away
                  </p>
                  <p className="text-sm font-semibold">
                    {listing.price} {listing.currency}{' '}
                    <span className="font-normal text-muted-foreground">/ night</span>
                  </p>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ol>
      <div
        aria-hidden="true"
        className="relative hidden flex-1 bg-gradient-to-br from-sky-50 to-emerald-50 md:block dark:from-sky-950 dark:to-emerald-950"
      >
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
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground px-2.5 py-1 text-xs font-semibold text-background shadow-md transition data-[active=true]:scale-110"
            >
              {listing.price} {listing.currency}
            </div>
          );
        })}
      </div>
    </div>
  );
}
