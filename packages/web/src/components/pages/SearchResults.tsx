'use client';

import type { ListingSummary } from '@travel-booking/core';
import { useFormatter, useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { carryDatesAndGuests } from '@/lib/utils';
import { useIsDesktop } from '@/hooks/useIsDesktop';

type SearchResultsProps = {
  results: ListingSummary[];
  checkIn?: string;
  checkOut?: string;
  guests?: number;
};

// Code-split so its bundle (MapLibre GL JS) is only ever fetched when a
// desktop viewport is actually going to render it — see the `isDesktop`
// check below, which also prevents this from mounting at all on mobile.
const SearchResultsMap = dynamic(
  () => import('./SearchResultsMap').then((mod) => mod.SearchResultsMap),
  { ssr: false },
);

export function SearchResults({ results, checkIn, checkOut, guests }: SearchResultsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const isDesktop = useIsDesktop();
  const t = useTranslations('SearchResults');
  const format = useFormatter();

  // Carries the guest's selected dates/guest count forward from Search so the
  // Listing Detail page can reflect them (same params Search's own filter
  // links already thread through).
  function listingHref(id: string) {
    return `/listings/${id}${carryDatesAndGuests({ checkIn, checkOut, guests })}`;
  }

  // The map wrapper below is aria-hidden (it duplicates, purely visually,
  // listings already reachable as real <Link>s in the results list), but
  // MapLibre's own canvas and required tile-attribution links are still
  // natively focusable — so keyboard Tab can still reach content a screen
  // reader is told doesn't exist. MapLibre creates that canvas and the
  // attribution control asynchronously (after its own network fetch of the
  // remote style/tiles), well after this wrapper itself mounts, so a
  // one-time fixup on map "load" is too late for anything that inspects the
  // page before then. A MutationObserver attached the instant this node
  // mounts catches every focusable element the moment it's inserted,
  // regardless of that timing. tabIndex doesn't affect pointer events, so
  // hover/click on markers and the attribution links themselves keep
  // working for mouse users — this only removes them from the Tab sequence.
  const mapWrapperRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const container = node;

    // `summary` (MapLibre's attribution disclosure toggle on narrow
    // containers), like the rest of these, is natively focusable from its
    // tag semantics alone — no `tabindex` attribute to key off, unlike the
    // canvas and attribution links.
    function stripTabIndex() {
      for (const el of container.querySelectorAll<HTMLElement>(
        'a, button, input, select, textarea, summary, iframe, [tabindex], [contenteditable="true"]',
      )) {
        if (el.tabIndex !== -1) el.tabIndex = -1;
      }
    }

    stripTabIndex();
    const observer = new MutationObserver(stripTabIndex);
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex h-[520px] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-azulejo/10 sm:h-[600px]">
      <ol aria-label={t('resultsLabel')} className="w-full space-y-3 overflow-y-auto p-4 md:w-1/2">
        {results.map((listing) => (
          <li
            key={listing.id}
            onMouseEnter={() => setActiveId(listing.id)}
            onMouseLeave={() => setActiveId((id) => (id === listing.id ? null : id))}
          >
            <Link
              href={listingHref(listing.id)}
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
                <p className="font-mono text-xs text-azulejo/70">
                  {t('distanceAway', {
                    distance: format.number(listing.distanceKm, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    }),
                  })}
                </p>
                <p className="text-sm font-medium text-foreground">{listing.title}</p>
                <p className="font-mono text-sm font-semibold text-azulejo">
                  {format.number(listing.price, { style: 'currency', currency: listing.currency })}{' '}
                  <span className="font-normal text-muted-foreground">{t('perNight')}</span>
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
      <div
        ref={mapWrapperRef}
        aria-hidden="true"
        data-testid="search-results-map"
        className="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-azulejo-light/10 via-limestone to-gold/10 md:block"
      >
        {isDesktop && (
          <SearchResultsMap
            results={results}
            activeId={activeId}
            onHoverChange={setActiveId}
            getHref={listingHref}
          />
        )}
      </div>
    </div>
  );
}
