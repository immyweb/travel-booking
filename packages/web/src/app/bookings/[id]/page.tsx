import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { fetchBooking, fetchListing } from '@/lib/api';

type BookingConfirmationPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: BookingConfirmationPageProps): Promise<Metadata> {
  const { id } = await params;

  // Same URL as the page component's own fetchBooking call below — Next.js
  // memoizes identical GET fetches within a render pass, so this avoids a
  // second round trip to the API for the same booking.
  const booking = await fetchBooking(id);
  if (!booking) {
    notFound();
  }

  return { title: 'Booking confirmation' };
}

export default async function BookingConfirmationPage({ params }: BookingConfirmationPageProps) {
  const { id } = await params;

  const booking = await fetchBooking(id);
  if (!booking) {
    notFound();
  }

  // The Booking record only snapshots listingId (no title/photo) — this is
  // a second, current-data fetch rather than trusting a snapshot, matching
  // every other page's convention of always reading canonical listing data.
  const listing = await fetchListing(booking.listingId);
  if (!listing) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Booking confirmed</h1>
        <p className="text-muted-foreground">
          {listing.city}, {listing.country}
        </p>
      </div>

      <div className="flex gap-4 rounded-lg border border-border p-4">
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Image
            src={listing.images[0]!}
            alt={listing.title}
            fill
            sizes="128px"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="font-medium">{listing.title}</h2>
          <p className="text-sm text-muted-foreground">
            {booking.checkIn} – {booking.checkOut} · {booking.nights} night
            {booking.nights === 1 ? '' : 's'}
          </p>
          <p className="text-lg font-semibold">
            {booking.totalPrice} {booking.currency} total
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1 rounded-lg border border-border p-4">
        <h2 className="text-lg font-medium">Guest details</h2>
        <p className="text-sm text-muted-foreground">{booking.guestName}</p>
        <p className="text-sm text-muted-foreground">{booking.guestEmail}</p>
      </div>
    </main>
  );
}
