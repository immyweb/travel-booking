'use client';

import type { Amenity, SearchResponse } from '@travel-booking/core';
import Link from 'next/link';
import { use } from 'react';
import { EmptyState } from './EmptyState';
import { SearchResults } from './SearchResults';

type SearchResultsSectionProps = {
  resultsPromise: Promise<SearchResponse>;
  city: { city: string; country: string };
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  amenities: Amenity[];
};

export function SearchResultsSection({
  resultsPromise,
  city,
  checkIn,
  checkOut,
  guests,
  amenities,
}: SearchResultsSectionProps) {
  const { pagination, results } = use(resultsPromise);

  function pageHref(targetPage: number) {
    const params = new URLSearchParams({
      city: city.city,
      country: city.country,
      ...(checkIn && checkOut ? { checkIn, checkOut } : {}),
      ...(guests ? { guests: String(guests) } : {}),
      page: String(targetPage),
    });
    for (const amenity of amenities) params.append('amenities', amenity);
    return `/search?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      {results.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <p className="font-mono text-xs text-azulejo/60">
            {pagination.total} {pagination.total === 1 ? 'stay' : 'stays'} found
          </p>
          <SearchResults results={results} checkIn={checkIn} checkOut={checkOut} guests={guests} />
        </>
      )}

      {pagination.totalPages > 1 && (
        <nav
          aria-label="Search results pages"
          className="flex items-center justify-center gap-4 pt-2 text-sm"
        >
          {pagination.page > 1 ? (
            <Link
              href={pageHref(pagination.page - 1)}
              className="font-medium text-azulejo hover:text-terracotta"
            >
              Previous
            </Link>
          ) : (
            <span className="text-muted-foreground">Previous</span>
          )}
          <span className="font-mono text-xs text-azulejo/70">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          {pagination.page < pagination.totalPages ? (
            <Link
              href={pageHref(pagination.page + 1)}
              className="font-medium text-azulejo hover:text-terracotta"
            >
              Next
            </Link>
          ) : (
            <span className="text-muted-foreground">Next</span>
          )}
        </nav>
      )}
    </div>
  );
}
