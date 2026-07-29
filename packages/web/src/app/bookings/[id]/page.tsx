import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { displayFont } from '@/app/_components/fonts';
import { ListingSummaryCard } from '@/app/_components/ListingSummaryCard';
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
    <main className="flex flex-1 flex-col bg-limestone">
      <div className="motion-safe:animate-[rise-in_0.5s_ease-out] mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-xs tracking-wide text-azulejo/60 uppercase">
            {listing.city}, {listing.country}
          </p>
          <h1
            className={`${displayFont.className} text-3xl font-semibold text-azulejo sm:text-4xl`}
          >
            Booking confirmed
          </h1>
        </div>

        <ListingSummaryCard title={listing.title} image={listing.images[0]!}>
          <p className="font-mono text-sm text-azulejo/80">
            {booking.checkIn} – {booking.checkOut} · {booking.nights} night
            {booking.nights === 1 ? '' : 's'}
          </p>
          <p className="font-mono text-lg font-semibold text-azulejo">
            {booking.totalPrice} {booking.currency} total
          </p>
        </ListingSummaryCard>

        <div className="h-px w-full bg-azulejo/10" />

        <div className="flex flex-col gap-1.5 rounded-2xl bg-white p-6 ring-1 ring-azulejo/10 shadow-sm">
          <h2 className={`${displayFont.className} text-xl font-semibold text-azulejo`}>
            Guest details
          </h2>
          <p className="text-sm text-muted-foreground">{booking.guestName}</p>
          <p className="text-sm text-muted-foreground">{booking.guestEmail}</p>
        </div>
      </div>
    </main>
  );
}
