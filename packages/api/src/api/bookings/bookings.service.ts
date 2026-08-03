import type { Booking, CreateBooking } from '@travel-booking/core';
import { asc, eq } from 'drizzle-orm';
import { SQL } from 'bun';
import { ApiError } from '../../errors/errors';
import type { Auth } from '../../auth/auth';
import type { Db } from '../../db/db';
import type { Logger } from '../../logging/logger';
import type { Mailer } from '../../mailer/mailer';
import { bookingConfirmationEmail } from '../../mailer/emails/BookingConfirmationEmail';
import { bookings, listings } from '../../db/schema';
import { nightsBetween } from '../../pricing/nights';

// Postgres SQLSTATE for an EXCLUDE constraint violation — the
// bookings_no_overlapping_dates constraint added in #16 rejects the insert
// itself rather than us pre-checking, so a concurrent overlapping booking
// surfaces here as a driver error, not an application-level race.
const EXCLUSION_VIOLATION = '23P01';

export type CreateBookingDependencies = {
  db: Db;
  mailer: Mailer;
  logger: Logger;
  webAppUrl: string;
  auth: Auth;
};

function toBooking(row: typeof bookings.$inferSelect): Booking {
  return { ...row, nights: nightsBetween(row.checkIn, row.checkOut) };
}

export async function createBooking(
  { db, mailer, logger, webAppUrl }: CreateBookingDependencies,
  input: CreateBooking,
): Promise<Booking> {
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

  let row: typeof bookings.$inferSelect | undefined;
  try {
    [row] = await db
      .insert(bookings)
      .values({
        listingId: input.listingId,
        userId: input.userId,
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

  const booking = toBooking(row!);
  const confirmationUrl = `${webAppUrl}/bookings/${booking.id}`;

  // Best-effort: the booking has already succeeded and is never rolled back
  // or retried for a failed send. Await it (so the side effect stays
  // deterministic and testable) but never let it reach the caller — a flaky
  // email provider must not turn a successful booking into a 500.
  try {
    const { subject, react } = bookingConfirmationEmail({
      guestName: booking.guestName,
      listingTitle: listing.title,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      nights: booking.nights,
      totalPrice: booking.totalPrice,
      currency: booking.currency,
      confirmationUrl,
    });

    await mailer.send({
      to: booking.guestEmail,
      subject,
      react,
      // Resend's own recommended <event-type>/<entity-id> pattern, so a
      // future retry mechanism can never double-send for the same booking.
      idempotencyKey: `booking-confirmation/${booking.id}`,
    });
  } catch (err) {
    logger.error(err, `Failed to send booking confirmation email for booking ${booking.id}`);
  }

  return booking;
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
