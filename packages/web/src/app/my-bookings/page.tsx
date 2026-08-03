import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { displayFont } from '@/app/_components/fonts';
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
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-xs tracking-wide text-azulejo/60 uppercase">
            Travel Booking
          </p>
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
                  className="flex flex-col gap-1.5 rounded-2xl bg-white p-6 ring-1 ring-azulejo/10 shadow-sm transition hover:bg-limestone/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
                >
                  <p className="font-mono text-sm text-azulejo/80">
                    {booking.checkIn} – {booking.checkOut} · {booking.nights} night
                    {booking.nights === 1 ? '' : 's'}
                  </p>
                  <p className="text-sm font-medium text-foreground">{booking.guestName}</p>
                  <p className="font-mono text-sm font-semibold text-azulejo">
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
