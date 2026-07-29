'use client';

import Image from 'next/image';
import Link from 'next/link';
import { use } from 'react';
import { displayFont } from './fonts';

export type Deal = {
  id: string;
  title: string;
  image: string;
  price: number;
  currency: string;
  city: string;
  country: string;
};

type DealsSectionProps = {
  dealsPromise: Promise<Deal[]>;
};

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

// Takes a promise, not resolved data, so the Suspense boundary in page.tsx
// can stream the header/hero in immediately without waiting on this — same
// pattern as Search's SearchResultsSection + resultsPromise.
export function DealsSection({ dealsPromise }: DealsSectionProps) {
  const deals = use(dealsPromise);

  if (deals.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
      <div className="mb-8 max-w-xl">
        <h2 className={`${displayFont.className} text-2xl font-semibold text-azulejo sm:text-3xl`}>
          Deals on offer
        </h2>
        <p className="mt-2 text-muted-foreground">
          Real stays, straight from the destinations we cover — priced per night, no games.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {deals.map((deal, index) => (
          <li key={deal.id}>
            <Link href={`/listings/${deal.id}`} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                <Image
                  src={deal.image}
                  alt={deal.title}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  // The first card is this section's likely LCP element —
                  // Next.js flags it in dev if it isn't prioritized.
                  priority={index === 0}
                />
              </div>
              <p className="mt-3 font-mono text-xs tracking-wide text-azulejo/70 uppercase">
                {deal.city}, {deal.country}
              </p>
              <h3 className="mt-0.5 font-medium text-foreground">{deal.title}</h3>
              <p className="mt-0.5 font-mono text-sm text-muted-foreground">
                From {formatPrice(deal.price, deal.currency)} / night
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
