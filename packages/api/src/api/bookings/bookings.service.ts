import type { Booking, CreateBooking } from '@travel-booking/core';
import { eq } from 'drizzle-orm';
import { SQL } from 'bun';
import { ApiError } from '../../errors/errors';
import type { Db } from '../../db/db';
import { bookings, listings } from '../../db/schema';
import { nightsBetween } from '../../pricing/nights';

// Postgres SQLSTATE for an EXCLUDE constraint violation — the
// bookings_no_overlapping_dates constraint added in #16 rejects the insert
// itself rather than us pre-checking, so a concurrent overlapping booking
// surfaces here as a driver error, not an application-level race.
const EXCLUSION_VIOLATION = '23P01';

function toBooking(row: typeof bookings.$inferSelect): Booking {
  return { ...row, nights: nightsBetween(row.checkIn, row.checkOut) };
}

export async function createBooking(db: Db, input: CreateBooking): Promise<Booking> {
  const [listing] = await db
    .select({ price: listings.price, currency: listings.currency, maxGuests: listings.maxGuests })
    .from(listings)
    .where(eq(listings.id, input.listingId))
    .limit(1);

  if (!listing) {
    throw new ApiError(404, 'Listing not found');
  }

  if (input.guests > listing.maxGuests) {
    throw new ApiError(400, `guests exceeds this listing's maxGuests (${listing.maxGuests})`);
  }

  const totalPrice = nightsBetween(input.checkIn, input.checkOut) * listing.price;

  let row: typeof bookings.$inferSelect | undefined;
  try {
    [row] = await db
      .insert(bookings)
      .values({
        listingId: input.listingId,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        guests: input.guests,
        totalPrice,
        currency: listing.currency,
      })
      .returning();
  } catch (err) {
    // drizzle-orm wraps the driver error in its own DrizzleQueryError; the
    // actual bun:sql PostgresError — whose `errno` carries the Postgres
    // SQLSTATE — is on `.cause`.
    const cause = err instanceof Error ? err.cause : undefined;
    if (cause instanceof SQL.PostgresError && cause.errno === EXCLUSION_VIOLATION) {
      throw new ApiError(409, 'Booking dates overlap an existing booking for this listing');
    }
    throw err;
  }

  return toBooking(row!);
}

export async function getBookingById(db: Db, id: string): Promise<Booking | null> {
  const [row] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);

  return row ? toBooking(row) : null;
}
