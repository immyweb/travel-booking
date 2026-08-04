import { eq, inArray, like } from 'drizzle-orm';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { user } from '../../db/auth-schema';
import { bookings, listings } from '../../db/schema';
import { createTestContext } from '../../test-support/context';
import { signUpTestUser } from '../../test-support/auth';

const { app, db, mailer, paymentProvider } = createTestContext();

// Isolated from real curated/seed data — and from other test files' own marker
// countries, since test files run as separate processes against the same
// database — by a marker country unique to this file.
const TEST_COUNTRY = 'BookingsRoutesTestland';

// Same marker-domain pattern as auth.test.ts: keeps this file's users unique
// (and cleaned up) run over run, since signUpTestUser's own default email
// counter resets to 1 every process but earlier runs' users are still in the
// database.
const TEST_EMAIL_DOMAIN = 'bookings-routes-test.example';
let userCounter = 0;

async function signUpBookingTestUser() {
  return signUpTestUser(app, { email: `user-${++userCounter}@${TEST_EMAIL_DOMAIN}` });
}

async function seedListing(overrides: Partial<{ price: number; maxGuests: number }> = {}) {
  const [row] = await db
    .insert(listings)
    .values({
      title: 'Sunny Alfama studio',
      price: overrides.price ?? 100,
      currency: 'EUR',
      maxGuests: overrides.maxGuests ?? 4,
      amenities: ['wifi'],
      city: 'Lisbon',
      country: TEST_COUNTRY,
      location: { latitude: 38.7169, longitude: -9.1399 },
      images: ['https://example.com/1.jpg'],
    })
    .returning({ id: listings.id });

  return row!.id;
}

// `createdAt` defaults to "just now" (a live hold); the reclaim tests below
// override it to simulate an abandoned checkout past the 15-minute window.
async function seedBooking(
  listingId: string,
  userId: string,
  checkIn: string,
  checkOut: string,
  overrides: Partial<{ status: 'pending' | 'confirmed'; createdAt: Date }> = {},
) {
  await db.insert(bookings).values({
    listingId,
    userId,
    checkIn,
    checkOut,
    guestName: 'Existing Guest',
    guestEmail: 'existing-guest@example.com',
    guests: 1,
    totalPrice: 1,
    currency: 'EUR',
    ...overrides,
  });
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
  paymentProvider.createPaymentIntent.mockClear();
});

describe('POST /bookings', () => {
  it('returns 201 pending with a clientSecret, linked to the signed-in user, and creates a PaymentIntent', async () => {
    const listingId = await seedListing({ price: 100 });
    const user = await signUpBookingTestUser();

    const response = await request(app).post('/bookings').set('Cookie', user.cookie).send({
      listingId,
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
      guests: 2,
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      booking: {
        id: expect.any(String),
        listingId,
        userId: user.id,
        checkIn: '2026-08-05',
        checkOut: '2026-08-10',
        guests: 2,
        guestName: 'Jane Doe',
        guestEmail: 'jane@example.com',
        nights: 5,
        totalPrice: 500,
        currency: 'EUR',
        status: 'pending',
      },
      clientSecret: expect.any(String),
    });
    expect(paymentProvider.createPaymentIntent).toHaveBeenCalledExactlyOnceWith({
      amount: 50000,
      currency: 'EUR',
      metadata: { bookingId: response.body.booking.id },
    });
    // No confirmation email at creation time — that moves to the
    // POST /webhooks/stripe handler (#32), triggered by actual payment
    // success rather than by the hold merely being created.
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('allows guestName/guestEmail to differ from the signed-in account', async () => {
    const listingId = await seedListing();
    const user = await signUpBookingTestUser();

    const response = await request(app).post('/bookings').set('Cookie', user.cookie).send({
      listingId,
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
      guests: 1,
      guestName: 'Someone Else',
      guestEmail: 'someone-else@example.com',
    });

    expect(response.status).toBe(201);
    expect(response.body.booking).toMatchObject({
      userId: user.id,
      guestName: 'Someone Else',
      guestEmail: 'someone-else@example.com',
    });
  });

  it('returns 401 when there is no session', async () => {
    const listingId = await seedListing();

    const response = await request(app).post('/bookings').send({
      listingId,
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
      guests: 1,
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
    });

    expect(response.status).toBe(401);
  });

  it('returns 404 for an unknown listingId', async () => {
    const user = await signUpBookingTestUser();

    const response = await request(app).post('/bookings').set('Cookie', user.cookie).send({
      listingId: '00000000-0000-0000-0000-000000000000',
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
      guests: 1,
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
    });

    expect(response.status).toBe(404);
  });

  it("returns 400 when guests exceeds the listing's maxGuests", async () => {
    const listingId = await seedListing({ maxGuests: 2 });
    const user = await signUpBookingTestUser();

    const response = await request(app).post('/bookings').set('Cookie', user.cookie).send({
      listingId,
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
      guests: 3,
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
    });

    expect(response.status).toBe(400);
  });

  it('returns 400 when dates are missing', async () => {
    const listingId = await seedListing();
    const user = await signUpBookingTestUser();

    const response = await request(app).post('/bookings').set('Cookie', user.cookie).send({
      listingId,
      guests: 1,
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
    });

    expect(response.status).toBe(400);
  });

  it('returns 400 when dates are malformed', async () => {
    const listingId = await seedListing();
    const user = await signUpBookingTestUser();

    const response = await request(app).post('/bookings').set('Cookie', user.cookie).send({
      listingId,
      checkIn: 'not-a-date',
      checkOut: '2026-08-10',
      guests: 1,
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
    });

    expect(response.status).toBe(400);
  });

  it('returns 400 when checkOut is not after checkIn', async () => {
    const listingId = await seedListing();
    const user = await signUpBookingTestUser();

    const response = await request(app).post('/bookings').set('Cookie', user.cookie).send({
      listingId,
      checkIn: '2026-08-10',
      checkOut: '2026-08-05',
      guests: 1,
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
    });

    expect(response.status).toBe(400);
  });

  it('returns 409 when the colliding booking is pending and within the 15-minute hold window', async () => {
    const listingId = await seedListing();
    const user = await signUpBookingTestUser();
    await seedBooking(listingId, user.id, '2026-08-05', '2026-08-10');

    const response = await request(app).post('/bookings').set('Cookie', user.cookie).send({
      listingId,
      checkIn: '2026-08-07',
      checkOut: '2026-08-12',
      guests: 1,
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
    });

    expect(response.status).toBe(409);
  });

  it('returns 409 when the colliding booking is confirmed, regardless of age', async () => {
    const listingId = await seedListing();
    const user = await signUpBookingTestUser();
    await seedBooking(listingId, user.id, '2026-08-05', '2026-08-10', {
      status: 'confirmed',
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
    });

    const response = await request(app).post('/bookings').set('Cookie', user.cookie).send({
      listingId,
      checkIn: '2026-08-07',
      checkOut: '2026-08-12',
      guests: 1,
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
    });

    expect(response.status).toBe(409);
  });

  it('reclaims and succeeds when the colliding pending booking is older than the 15-minute hold window', async () => {
    const listingId = await seedListing();
    const user = await signUpBookingTestUser();
    await seedBooking(listingId, user.id, '2026-08-05', '2026-08-10', {
      createdAt: new Date(Date.now() - 16 * 60 * 1000),
    });

    const response = await request(app).post('/bookings').set('Cookie', user.cookie).send({
      listingId,
      checkIn: '2026-08-07',
      checkOut: '2026-08-12',
      guests: 1,
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
    });

    expect(response.status).toBe(201);
    expect(response.body.booking).toMatchObject({
      checkIn: '2026-08-07',
      checkOut: '2026-08-12',
      status: 'pending',
    });
  });
});

describe('GET /bookings/:id', () => {
  it('returns 200 with the full booking shape for a seeded booking', async () => {
    const listingId = await seedListing();
    const user = await signUpBookingTestUser();
    const [row] = await db
      .insert(bookings)
      .values({
        listingId,
        userId: user.id,
        checkIn: '2026-08-05',
        checkOut: '2026-08-10',
        guestName: 'Jane Doe',
        guestEmail: 'jane@example.com',
        guests: 2,
        totalPrice: 500,
        currency: 'EUR',
      })
      .returning({ id: bookings.id });
    const id = row!.id;

    const response = await request(app).get(`/bookings/${id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id,
      listingId,
      userId: user.id,
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
      guests: 2,
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
      nights: 5,
      totalPrice: 500,
      currency: 'EUR',
      status: 'pending',
    });
  });

  it('returns 404 for a well-formed UUID that matches no booking', async () => {
    const response = await request(app).get('/bookings/00000000-0000-0000-0000-000000000000');

    expect(response.status).toBe(404);
  });

  it('returns 400 for a malformed (non-UUID) id', async () => {
    const response = await request(app).get('/bookings/not-a-uuid');

    expect(response.status).toBe(400);
  });
});

describe('GET /bookings/mine', () => {
  it('returns 401 when there is no session', async () => {
    const response = await request(app).get('/bookings/mine');

    expect(response.status).toBe(401);
  });

  it('returns an empty array when the signed-in user has no bookings', async () => {
    const user = await signUpBookingTestUser();

    const response = await request(app).get('/bookings/mine').set('Cookie', user.cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("returns only the signed-in user's own bookings, not another user's", async () => {
    const listingId = await seedListing();
    const user = await signUpBookingTestUser();
    const otherUser = await signUpBookingTestUser();
    await seedBooking(listingId, user.id, '2026-08-05', '2026-08-10');
    await seedBooking(listingId, otherUser.id, '2026-09-01', '2026-09-05');

    const response = await request(app).get('/bookings/mine').set('Cookie', user.cookie);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ userId: user.id, checkIn: '2026-08-05' });
  });

  it('orders bookings by soonest check-in first', async () => {
    const listingId = await seedListing();
    const user = await signUpBookingTestUser();
    await seedBooking(listingId, user.id, '2026-10-01', '2026-10-05');
    await seedBooking(listingId, user.id, '2026-08-05', '2026-08-10');

    const response = await request(app).get('/bookings/mine').set('Cookie', user.cookie);

    expect(response.status).toBe(200);
    expect(response.body.map((booking: { checkIn: string }) => booking.checkIn)).toEqual([
      '2026-08-05',
      '2026-10-01',
    ]);
  });
});
