import { eq, inArray } from 'drizzle-orm';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { bookings, listings } from '../../db/schema';
import { createTestContext } from '../../test-support/context';

const { app, db } = createTestContext();

// Isolated from real curated/seed data — and from other test files' own marker
// countries, since test files run as separate processes against the same
// database — by a marker country unique to this file.
const TEST_COUNTRY = 'BookingsRoutesTestland';

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

async function seedBooking(listingId: string, checkIn: string, checkOut: string) {
  await db.insert(bookings).values({
    listingId,
    checkIn,
    checkOut,
    guestName: 'Existing Guest',
    guestEmail: 'existing-guest@example.com',
    guests: 1,
    totalPrice: 1,
    currency: 'EUR',
  });
}

afterEach(async () => {
  const testListingIds = db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.country, TEST_COUNTRY));
  await db.delete(bookings).where(inArray(bookings.listingId, testListingIds));
  await db.delete(listings).where(eq(listings.country, TEST_COUNTRY));
});

describe('POST /bookings', () => {
  it('returns 201 with correct nights/totalPrice for valid input', async () => {
    const listingId = await seedListing({ price: 100 });

    const response = await request(app).post('/bookings').send({
      listingId,
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
      guests: 2,
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(String),
      listingId,
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
      guests: 2,
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
      nights: 5,
      totalPrice: 500,
      currency: 'EUR',
    });
  });

  it('returns 404 for an unknown listingId', async () => {
    const response = await request(app).post('/bookings').send({
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

    const response = await request(app).post('/bookings').send({
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

    const response = await request(app).post('/bookings').send({
      listingId,
      guests: 1,
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
    });

    expect(response.status).toBe(400);
  });

  it('returns 400 when dates are malformed', async () => {
    const listingId = await seedListing();

    const response = await request(app).post('/bookings').send({
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

    const response = await request(app).post('/bookings').send({
      listingId,
      checkIn: '2026-08-10',
      checkOut: '2026-08-05',
      guests: 1,
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
    });

    expect(response.status).toBe(400);
  });

  it('returns 409 when the dates overlap an existing booking for the same listing', async () => {
    const listingId = await seedListing();
    await seedBooking(listingId, '2026-08-05', '2026-08-10');

    const response = await request(app).post('/bookings').send({
      listingId,
      checkIn: '2026-08-07',
      checkOut: '2026-08-12',
      guests: 1,
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
    });

    expect(response.status).toBe(409);
  });
});

describe('GET /bookings/:id', () => {
  it('returns 200 with the full booking shape for a seeded booking', async () => {
    const listingId = await seedListing();
    const [row] = await db
      .insert(bookings)
      .values({
        listingId,
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
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
      guests: 2,
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
      nights: 5,
      totalPrice: 500,
      currency: 'EUR',
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
