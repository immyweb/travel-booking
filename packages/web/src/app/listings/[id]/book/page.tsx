import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingSummaryCard } from '@/components/pages/ListingSummaryCard';
import { fetchListing } from '@/lib/api';
import { BookingForm } from './_components/BookingForm';

type BookListingPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string; guests?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: BookListingPageProps): Promise<Metadata> {
  const { id } = await params;
  const { checkIn, checkOut } = await searchParams;

  // Same URL as the page component's own fetchListing call below (when dates
  // are present) — Next.js memoizes identical GET fetches within a render
  // pass, so this avoids a second round trip to the API for the same listing.
  const listing = await fetchListing(id, checkIn && checkOut ? { checkIn, checkOut } : undefined);
  if (!listing) {
    notFound();
  }

  return { title: `Book ${listing.title}` };
}

export default async function BookListingPage({ params, searchParams }: BookListingPageProps) {
  const { id } = await params;
  const { checkIn, checkOut, guests } = await searchParams;

  // Dates are only meaningful (and only valid per the API's Zod schema) when
  // supplied together, mirroring Listing Detail's own treatment of a lone
  // in-progress selection as no filter at all.
  const hasDateRange = Boolean(checkIn && checkOut);
  const listing = await fetchListing(
    id,
    hasDateRange ? { checkIn: checkIn!, checkOut: checkOut! } : undefined,
  );

  if (!listing) {
    notFound();
  }

  // Only a positive integer within this listing's own capacity counts as a
  // usable carried-forward guest count — a value from a stale link or a
  // different listing's search still needs collecting/fixing here.
  const requestedGuests = Number(guests);
  const hasGuestCount =
    Boolean(guests) &&
    Number.isInteger(requestedGuests) &&
    requestedGuests > 0 &&
    requestedGuests <= listing.maxGuests;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Confirm your booking</h1>
        <p className="text-muted-foreground">
          {listing.city}, {listing.country}
        </p>
      </div>

      <ListingSummaryCard title={listing.title} image={listing.images[0]!}>
        <p className="text-sm text-muted-foreground">
          {listing.price} {listing.currency} / night · Sleeps up to {listing.maxGuests} guests
        </p>
        {listing.availability && (
          <p data-testid="stay-summary" className="text-sm text-muted-foreground">
            {listing.availability.checkIn} – {listing.availability.checkOut} ·{' '}
            {listing.availability.nights} night{listing.availability.nights === 1 ? '' : 's'} ·{' '}
            {listing.availability.totalPrice} {listing.currency} total
          </p>
        )}
      </ListingSummaryCard>

      <BookingForm
        listingId={listing.id}
        maxGuests={listing.maxGuests}
        checkIn={hasDateRange ? checkIn : undefined}
        checkOut={hasDateRange ? checkOut : undefined}
        guests={hasGuestCount ? requestedGuests : undefined}
      />
    </main>
  );
}
