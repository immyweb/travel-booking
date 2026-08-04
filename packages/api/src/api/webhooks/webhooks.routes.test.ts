import { eq, inArray, like } from 'drizzle-orm';
import request from 'supertest';
import type Stripe from 'stripe';
import { afterEach, describe, expect, it } from 'vitest';
import { user } from '../../db/auth-schema';
import { bookings, listings } from '../../db/schema';
import { createTestContext } from '../../test-support/context';
import { signUpTestUser } from '../../test-support/auth';

const { app, db, mailer, paymentProvider } = createTestContext();

// Isolated from other test files' own marker countries, since test files run
// as separate processes against the same database — same pattern as
// bookings.routes.test.ts.
const TEST_COUNTRY = 'WebhooksRoutesTestland';
const TEST_EMAIL_DOMAIN = 'webhooks-routes-test.example';
let userCounter = 0;

async function signUpWebhookTestUser() {
  return signUpTestUser(app, { email: `user-${++userCounter}@${TEST_EMAIL_DOMAIN}` });
}

async function seedListing() {
  const [row] = await db
    .insert(listings)
    .values({
      title: 'Sunny Alfama studio',
      price: 100,
      currency: 'EUR',
      maxGuests: 4,
      amenities: ['wifi'],
      city: 'Lisbon',
      country: TEST_COUNTRY,
      location: { latitude: 38.7169, longitude: -9.1399 },
      images: ['https://example.com/1.jpg'],
    })
    .returning({ id: listings.id });

  return row!.id;
}

async function seedBooking(
  listingId: string,
  userId: string,
  overrides: Partial<{ status: 'pending' | 'confirmed'; stripePaymentIntentId: string }> = {},
) {
  const [row] = await db
    .insert(bookings)
    .values({
      listingId,
      userId,
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
      guests: 1,
      totalPrice: 500,
      currency: 'EUR',
      stripePaymentIntentId: 'pi_test',
      ...overrides,
    })
    .returning({ id: bookings.id });

  return row!.id;
}

// verifyWebhookSignature is a bare vi.fn() on the fake provider — every test
// stubs its return value, so only the event shape our handler actually reads
// needs to be present.
function paymentIntentSucceededEvent(bookingId: string, paymentIntentId: string): Stripe.Event {
  return {
    id: `evt_${crypto.randomUUID()}`,
    type: 'payment_intent.succeeded',
    data: { object: { id: paymentIntentId, metadata: { bookingId } } },
  } as unknown as Stripe.Event;
}

afterEach(async () => {
  const testListingIds = db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.country, TEST_COUNTRY));
  await db.delete(bookings).where(inArray(bookings.listingId, testListingIds));
  await db.delete(listings).where(eq(listings.country, TEST_COUNTRY));
  await db.delete(user).where(like(user.email, `%@${TEST_EMAIL_DOMAIN}`));
  mailer.send.mockClear();
  paymentProvider.refund.mockClear();
  paymentProvider.getCardLast4.mockClear();
});

describe('POST /webhooks/stripe', () => {
  it('rejects a request with an invalid signature, without touching any Booking row', async () => {
    const listingId = await seedListing();
    const bookingUser = await signUpWebhookTestUser();
    const bookingId = await seedBooking(listingId, bookingUser.id);
    paymentProvider.verifyWebhookSignature.mockImplementationOnce(() => {
      throw new Error('Invalid signature');
    });

    const response = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'bad-sig')
      .send({});

    expect(response.status).toBe(400);
    const [row] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    expect(row?.status).toBe('pending');
    expect(mailer.send).not.toHaveBeenCalled();
    expect(paymentProvider.refund).not.toHaveBeenCalled();
  });

  it('acknowledges (200) and ignores event types other than payment_intent.succeeded', async () => {
    paymentProvider.verifyWebhookSignature.mockReturnValueOnce({
      id: 'evt_other',
      type: 'payment_intent.payment_failed',
      data: { object: {} },
    } as unknown as Stripe.Event);

    const response = await request(app).post('/webhooks/stripe').send({});

    expect(response.status).toBe(200);
    expect(mailer.send).not.toHaveBeenCalled();
    expect(paymentProvider.refund).not.toHaveBeenCalled();
  });

  it('confirms a pending Booking and sends exactly one confirmation email', async () => {
    const listingId = await seedListing();
    const bookingUser = await signUpWebhookTestUser();
    const bookingId = await seedBooking(listingId, bookingUser.id, {
      stripePaymentIntentId: 'pi_confirm',
    });
    paymentProvider.verifyWebhookSignature.mockReturnValueOnce(
      paymentIntentSucceededEvent(bookingId, 'pi_confirm'),
    );

    const response = await request(app).post('/webhooks/stripe').send({});

    expect(response.status).toBe(200);
    const [row] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    expect(row?.status).toBe('confirmed');
    expect(row?.cardLast4).toBe('4242');
    expect(paymentProvider.getCardLast4).toHaveBeenCalledExactlyOnceWith('pi_confirm');
    expect(mailer.send).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        to: 'jane@example.com',
        idempotencyKey: `booking-confirmation/${bookingId}`,
      }),
    );
  });

  it('is a no-op on redelivery of the same event, and still sends exactly one email overall', async () => {
    const listingId = await seedListing();
    const bookingUser = await signUpWebhookTestUser();
    const bookingId = await seedBooking(listingId, bookingUser.id, {
      stripePaymentIntentId: 'pi_redeliver',
    });

    paymentProvider.verifyWebhookSignature.mockReturnValueOnce(
      paymentIntentSucceededEvent(bookingId, 'pi_redeliver'),
    );
    const first = await request(app).post('/webhooks/stripe').send({});
    expect(first.status).toBe(200);

    paymentProvider.verifyWebhookSignature.mockReturnValueOnce(
      paymentIntentSucceededEvent(bookingId, 'pi_redeliver'),
    );
    const second = await request(app).post('/webhooks/stripe').send({});

    expect(second.status).toBe(200);
    expect(mailer.send).toHaveBeenCalledTimes(1);
    expect(paymentProvider.refund).not.toHaveBeenCalled();
    const [row] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    expect(row?.status).toBe('confirmed');
  });

  it('refunds and does not throw when no Booking exists for the event (already reclaimed)', async () => {
    const missingBookingId = '00000000-0000-0000-0000-000000000000';
    paymentProvider.verifyWebhookSignature.mockReturnValueOnce(
      paymentIntentSucceededEvent(missingBookingId, 'pi_orphaned'),
    );

    const response = await request(app).post('/webhooks/stripe').send({});

    expect(response.status).toBe(200);
    expect(paymentProvider.refund).toHaveBeenCalledExactlyOnceWith('pi_orphaned');
    expect(mailer.send).not.toHaveBeenCalled();
  });
});
