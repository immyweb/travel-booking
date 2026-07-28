import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { fetchListing } from '@/lib/api';
import { amenityLabel, carryDatesAndGuests } from '@/lib/utils';
import { ListingGallery } from './_components/ListingGallery';

type ListingDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string; guests?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: ListingDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const { checkIn, checkOut } = await searchParams;

  // Same URL as the page component's own fetchListing call below (when dates
  // are present) — Next.js memoizes identical GET fetches within a render
  // pass, so this avoids a second round trip to the API for the same listing.
  const listing = await fetchListing(id, checkIn && checkOut ? { checkIn, checkOut } : undefined);
  if (!listing) {
    notFound();
  }

  return {
    title: listing.title,
    description: `${listing.title} in ${listing.city}, ${listing.country} — ${listing.price} ${listing.currency} / night.`,
  };
}

export default async function ListingDetailPage({ params, searchParams }: ListingDetailPageProps) {
  const { id } = await params;
  const { checkIn, checkOut, guests } = await searchParams;

  // Dates are only meaningful (and only valid per the API's Zod schema) when
  // supplied together, mirroring how Search treats a lone in-progress
  // selection as no filter at all.
  const hasDateRange = Boolean(checkIn && checkOut);
  const listing = await fetchListing(
    id,
    hasDateRange ? { checkIn: checkIn!, checkOut: checkOut! } : undefined,
  );

  if (!listing) {
    notFound();
  }

  const { availability } = listing;
  // No dates chosen (a bookmarked/shared link) is treated the same as
  // available: nothing here blocks the guest from starting a booking.
  const canBook = availability === null || availability.available;

  // The booking flow itself is separate, not-yet-built work — this carries
  // the guest's dates/guest count forward the same way Search's own links do,
  // so whatever's built next doesn't have to re-collect them.
  const bookHref = `/listings/${listing.id}/book${carryDatesAndGuests({ checkIn, checkOut, guests })}`;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4">
      <ListingGallery images={listing.images} title={listing.title} />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{listing.title}</h1>
        <p className="text-muted-foreground">
          {listing.city}, {listing.country}
        </p>
        <p className="text-lg font-semibold">
          {listing.price} {listing.currency}{' '}
          <span className="text-sm font-normal text-muted-foreground">/ night</span>
        </p>
        <p className="text-sm text-muted-foreground">Sleeps up to {listing.maxGuests} guests</p>
      </div>

      {availability && (
        <div className="flex flex-col gap-1 rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">
            {availability.checkIn} – {availability.checkOut} · {availability.nights} night
            {availability.nights === 1 ? '' : 's'}
          </p>
          {availability.available ? (
            <p className="text-lg font-semibold">
              {availability.totalPrice} {listing.currency} total
            </p>
          ) : (
            <p className="text-sm font-medium text-destructive">Not available for these dates</p>
          )}
        </div>
      )}

      <div>
        {canBook ? (
          <Button asChild>
            <Link href={bookHref}>Book now</Link>
          </Button>
        ) : (
          <Button disabled>Book now</Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Amenities</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {listing.amenities.map((amenity) => (
            <li key={amenity} className="text-sm text-muted-foreground">
              {amenityLabel(amenity)}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
