import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { displayFont } from '@/app/_components/fonts';
import { TileMark } from '@/app/_components/TileMark';
import { fetchMyBookings, fetchSession } from '@/lib/api';
import { EmptyState } from './_components/EmptyState';

export const metadata: Metadata = { title: 'My Bookings' };

export default async function MyBookingsPage() {
  // Same session-gate pattern as /listings/[id]/book: checked before the
  // (session-scoped) bookings fetch, not after, so a signed-out customer
  // never triggers a request that's guaranteed to 401.
  const session = await fetchSession();
  if (!session) {
    redirect(`/sign-in?redirect=${encodeURIComponent('/my-bookings')}`);
  }

  const bookings = await fetchMyBookings();

  return (
    <main className="flex flex-1 flex-col bg-limestone">
      <div className="motion-safe:animate-[rise-in_0.5s_ease-out] mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
        <div className="relative flex flex-col gap-1.5">
          <TileMark className="pointer-events-none absolute -top-2 right-0 -z-10 size-28 text-azulejo/[0.04] sm:size-36" />
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-xs tracking-wide text-azulejo/60 uppercase">
              Travel Booking
            </p>
            {bookings.length > 0 && (
              <p className="font-mono text-xs tracking-wide text-azulejo/50 uppercase">
                {bookings.length} {bookings.length === 1 ? 'stay' : 'stays'}
              </p>
            )}
          </div>
          <h1
            className={`${displayFont.className} text-3xl font-semibold text-azulejo sm:text-4xl`}
          >
            My Bookings
          </h1>
        </div>

        {bookings.length === 0 ? (
          <EmptyState />
        ) : (
          <ul aria-label="Your bookings" className="flex flex-col gap-4">
            {bookings.map((booking) => (
              <li key={booking.id}>
                <Link
                  href={`/bookings/${booking.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-azulejo/10 shadow-sm transition hover:bg-limestone/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta sm:p-5"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-azulejo-light/15 via-limestone to-gold/10 ring-1 ring-azulejo/10 sm:size-14">
                    <TileMark className="size-5 text-azulejo/50 sm:size-6" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="font-mono text-sm font-semibold text-azulejo sm:text-base">
                      {booking.checkIn} – {booking.checkOut} · {booking.nights} night
                      {booking.nights === 1 ? '' : 's'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{booking.guestName}</p>
                  </div>
                  <div className="hidden h-10 w-px shrink-0 bg-azulejo/10 sm:block" />
                  <p className="shrink-0 font-mono text-base font-bold text-azulejo sm:text-lg">
                    {booking.totalPrice} {booking.currency} total
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
