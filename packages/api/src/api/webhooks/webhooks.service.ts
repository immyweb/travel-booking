import type Stripe from 'stripe';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db/db';
import type { Logger } from '../../logging/logger';
import type { Mailer } from '../../mailer/mailer';
import type { PaymentProvider } from '../../payments/payments';
import { bookingConfirmationEmail } from '../../mailer/emails/BookingConfirmationEmail';
import { bookings, listings } from '../../db/schema';
import { nightsBetween } from '../../pricing/nights';

export type StripeWebhookDependencies = {
  db: Db;
  mailer: Mailer;
  webAppUrl: string;
  paymentProvider: PaymentProvider;
  logger: Logger;
};

async function sendBookingConfirmationEmail(
  { db, mailer, webAppUrl }: StripeWebhookDependencies,
  booking: typeof bookings.$inferSelect,
): Promise<void> {
  const [listing] = await db
    .select({ title: listings.title })
    .from(listings)
    .where(eq(listings.id, booking.listingId))
    .limit(1);

  const { subject, react } = bookingConfirmationEmail({
    guestName: booking.guestName,
    listingTitle: listing!.title,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    nights: nightsBetween(booking.checkIn, booking.checkOut),
    totalPrice: booking.totalPrice,
    currency: booking.currency,
    confirmationUrl: `${webAppUrl}/bookings/${booking.id}`,
  });

  await mailer.send({
    to: booking.guestEmail,
    subject,
    react,
    // Same <event-type>/<entity-id> convention #24 used when this send lived
    // in bookings.service.ts, kept so a redelivered webhook can never
    // double-send even if Resend is ever asked to dedupe on this key.
    idempotencyKey: `booking-confirmation/${booking.id}`,
  });
}

// Handles a verified `payment_intent.succeeded` event. Checks the Booking's
// current state up front so the two no-op paths (an already-confirmed
// redelivery, an orphaned/reclaimed Booking) never pay for a Stripe API call
// to fetch card details they'll just discard. The final UPDATE stays
// conditioned on `status = 'pending'` regardless — that's the actual
// atomicity guard against a second delivery racing this one between the
// check above and here, not the check itself.
export async function handlePaymentIntentSucceeded(
  deps: StripeWebhookDependencies,
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  const bookingId = paymentIntent.metadata.bookingId;
  if (!bookingId) {
    // Never expected — this service always sets it when creating the
    // PaymentIntent (bookings.service.ts). Log loudly but still ack the
    // delivery: nothing about retrying would make a bookingId appear.
    deps.logger.error(
      `Stripe PaymentIntent ${paymentIntent.id} succeeded with no bookingId in its metadata`,
    );
    return;
  }

  const [existing] = await deps.db
    .select({ status: bookings.status })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!existing) {
    // Already reclaimed by #31's 15-minute hold logic before payment
    // completed: the charge succeeded for dates that are no longer held, so
    // it must be refunded rather than left uncaptured.
    await deps.paymentProvider.refund(paymentIntent.id);
    deps.logger.error(
      `No Booking ${bookingId} found for succeeded Stripe PaymentIntent ${paymentIntent.id} (hold likely reclaimed) — refunded`,
    );
    return;
  }

  if (existing.status !== 'pending') {
    // Already confirmed — a benign redelivery of an event already processed.
    return;
  }

  const cardLast4 = await deps.paymentProvider.getCardLast4(paymentIntent.id);

  const [confirmed] = await deps.db
    .update(bookings)
    .set({ status: 'confirmed', cardLast4 })
    .where(and(eq(bookings.id, bookingId), eq(bookings.status, 'pending')))
    .returning();

  // Empty only if a concurrent delivery won the race between the check above
  // and this UPDATE — vanishingly rare, and correctly a no-op: that other
  // delivery already sent the one confirmation email this Booking gets.
  if (confirmed) {
    await sendBookingConfirmationEmail(deps, confirmed);
  }
}
