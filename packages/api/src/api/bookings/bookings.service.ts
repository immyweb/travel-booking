import type { Booking, CreateBooking } from '@travel-booking/core';
import { and, asc, eq, lt } from 'drizzle-orm';
import { SQL } from 'bun';
import { ApiError } from '../../errors/errors';
import type { Auth } from '../../auth/auth';
import type { Db } from '../../db/db';
import type { PaymentProvider } from '../../payments/payments';
import { bookingOverlapsRange } from '../../db/booking-overlap';
import { bookings, listings } from '../../db/schema';
import { nightsBetween } from '../../pricing/nights';

// Postgres SQLSTATE for an EXCLUDE constraint violation — the
// bookings_no_overlapping_dates constraint added in #16 rejects the insert
// itself rather than us pre-checking, so a concurrent overlapping booking
// surfaces here as a driver error, not an application-level race.
const EXCLUSION_VIOLATION = '23P01';

// A pending Booking older than this is treated as an abandoned checkout: the
// next conflicting request reclaims its dates rather than 409ing forever.
const HOLD_WINDOW_MS = 15 * 60 * 1000;

export type CreateBookingDependencies = {
  db: Db;
  auth: Auth;
  paymentProvider: PaymentProvider;
};

function toBooking(row: typeof bookings.$inferSelect): Booking {
  return {
    id: row.id,
    listingId: row.listingId,
    userId: row.userId,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    guestName: row.guestName,
    guestEmail: row.guestEmail,
    guests: row.guests,
    totalPrice: row.totalPrice,
    currency: row.currency,
    status: row.status,
    nights: nightsBetween(row.checkIn, row.checkOut),
  };
}

function isExclusionViolation(err: unknown): boolean {
  // drizzle-orm wraps the driver error in its own DrizzleQueryError; the
  // actual bun:sql PostgresError — whose `errno` carries the Postgres
  // SQLSTATE — is on `.cause`.
  const cause = err instanceof Error ? err.cause : undefined;
  return cause instanceof SQL.PostgresError && cause.errno === EXCLUSION_VIOLATION;
}

async function insertPendingBooking(db: Db, values: typeof bookings.$inferInsert) {
  const [row] = await db.insert(bookings).values(values).returning();
  return row!;
}

function throwOverlapConflict(): never {
  throw new ApiError(409, 'Booking dates overlap an existing booking for this listing');
}

export async function createBooking(
  { db, paymentProvider }: CreateBookingDependencies,
  input: CreateBooking,
): Promise<{ booking: Booking; clientSecret: string }> {
  const [listing] = await db
    .select({
      title: listings.title,
      price: listings.price,
      currency: listings.currency,
      maxGuests: listings.maxGuests,
    })
    .from(listings)
    .where(eq(listings.id, input.listingId))
    .limit(1);

  if (!listing) {
    throw new ApiError(404, 'Listing not found');
  }

  if (input.guests > listing.maxGuests) {
    throw new ApiError(400, `guests exceeds this listing's maxGuests (${listing.maxGuests})`);
  }

  const nights = nightsBetween(input.checkIn, input.checkOut);
  const totalPrice = nights * listing.price;

  const values = {
    listingId: input.listingId,
    userId: input.userId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guests: input.guests,
    totalPrice,
    currency: listing.currency,
  };

  let row: typeof bookings.$inferSelect;
  try {
    // Inserted first — reserving the dates via the EXCLUDE constraint — so
    // the hold is in place before the (slower, network-bound) call out to
    // Stripe below.
    row = await insertPendingBooking(db, values);
  } catch (err) {
    if (!isExclusionViolation(err)) {
      throw err;
    }

    // A colliding row past the 15-minute hold window is an abandoned
    // checkout: reclaim it by deleting it and retry the insert once. A row
    // that's still within the window, or already confirmed, is a live hold
    // — no reclaim, no retry.
    const staleCutoff = new Date(Date.now() - HOLD_WINDOW_MS);
    const reclaimed = await db
      .delete(bookings)
      .where(
        and(
          eq(bookings.listingId, input.listingId),
          eq(bookings.status, 'pending'),
          lt(bookings.createdAt, staleCutoff),
          bookingOverlapsRange(input.checkIn, input.checkOut),
        ),
      )
      .returning({ id: bookings.id });

    if (reclaimed.length === 0) {
      throwOverlapConflict();
    }

    try {
      row = await insertPendingBooking(db, values);
    } catch (retryErr) {
      if (isExclusionViolation(retryErr)) {
        throwOverlapConflict();
      }
      throw retryErr;
    }
  }

  const booking = toBooking(row);

  const paymentIntent = await paymentProvider.createPaymentIntent({
    amount: booking.totalPrice * 100,
    currency: booking.currency,
    metadata: { bookingId: booking.id },
  });

  await db
    .update(bookings)
    .set({ stripePaymentIntentId: paymentIntent.id })
    .where(eq(bookings.id, booking.id));

  // No confirmation email here — sent by the POST /webhooks/stripe handler
  // (#32) once payment actually succeeds, not at hold-creation time.
  return { booking, clientSecret: paymentIntent.clientSecret };
}

export async function getBookingById(db: Db, id: string): Promise<Booking | null> {
  const [row] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);

  return row ? toBooking(row) : null;
}

// Soonest check-in first — the most relevant ordering for a customer
// reviewing their own travel plans on My Bookings.
export async function getBookingsForUser(db: Db, userId: string): Promise<Booking[]> {
  const rows = await db
    .select()
    .from(bookings)
    .where(eq(bookings.userId, userId))
    .orderBy(asc(bookings.checkIn));

  return rows.map(toBooking);
}
