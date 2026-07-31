import { eq, inArray } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { bookings, listings } from '../../db/schema';
import { createTestContext } from '../../test-support/context';
import { signUpSharedTestUser } from '../../test-support/auth';

const { app, db } = createTestContext();

// Isolated from real curated/seed data — and from other test files' own marker
// countries, since test files run as separate processes against the same
// database — by a marker country unique to this file.
const TEST_COUNTRY = 'ListingDetailTestland';

// Signed up once in beforeAll, not afterEach-cleaned, since every seeded
// booking in this file shares one account — these tests exercise Listing
// Detail's availability logic, not who a booking belongs to.
let testUserId: string;
let cleanupTestUser: () => Promise<void>;

beforeAll(async () => {
  ({ userId: testUserId, cleanup: cleanupTestUser } = await signUpSharedTestUser(
    app,
    db,
    'listings-routes-test.example',
  ));
});

afterAll(async () => {
  await cleanupTestUser();
});

async function seedListing() {
  const [row] = await db
    .insert(listings)
    .values({
      title: 'Sunny Alfama studio',
      price: 82,
      currency: 'EUR',
      maxGuests: 4,
      amenities: ['wifi', 'parking'],
      city: 'Lisbon',
      country: TEST_COUNTRY,
      location: { latitude: 38.7169, longitude: -9.1399 },
      images: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
    })
    .returning({ id: listings.id });

  return row!.id;
}

async function seedBooking(listingId: string, checkIn: string, checkOut: string) {
  await db.insert(bookings).values({
    listingId,
    userId: testUserId,
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

describe('GET /listings/:id', () => {
  it('returns 200 with the full listing shape for a seeded id', async () => {
    const id = await seedListing();

    const response = await request(app).get(`/listings/${id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id,
      title: 'Sunny Alfama studio',
      images: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
      price: 82,
      currency: 'EUR',
      maxGuests: 4,
      amenities: ['wifi', 'parking'],
      city: 'Lisbon',
      country: TEST_COUNTRY,
      coordinates: {
        latitude: expect.closeTo(38.7169, 3),
        longitude: expect.closeTo(-9.1399, 3),
      },
      availability: null,
    });
  });

  it('returns 404 for a well-formed UUID that matches no listing', async () => {
    const response = await request(app).get('/listings/00000000-0000-0000-0000-000000000000');

    expect(response.status).toBe(404);
  });

  it('returns 400 for a malformed (non-UUID) id', async () => {
    const response = await request(app).get('/listings/not-a-uuid');

    expect(response.status).toBe(400);
  });

  it('returns available: true with computed nights/totalPrice when the dates have no overlapping booking', async () => {
    const id = await seedListing();

    const response = await request(app)
      .get(`/listings/${id}`)
      .query({ checkIn: '2026-08-05', checkOut: '2026-08-10' });

    expect(response.status).toBe(200);
    expect(response.body.availability).toEqual({
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
      available: true,
      nights: 5,
      totalPrice: 410,
    });
  });

  it('returns available: false when an existing booking overlaps the requested dates', async () => {
    const id = await seedListing();
    await seedBooking(id, '2026-08-07', '2026-08-12');

    const response = await request(app)
      .get(`/listings/${id}`)
      .query({ checkIn: '2026-08-05', checkOut: '2026-08-10' });

    expect(response.status).toBe(200);
    expect(response.body.availability).toMatchObject({ available: false });
  });

  it('returns 400 when only one of checkIn/checkOut is supplied', async () => {
    const id = await seedListing();

    const response = await request(app).get(`/listings/${id}`).query({ checkIn: '2026-08-05' });

    expect(response.status).toBe(400);
  });

  it('returns 400 when checkOut is not after checkIn', async () => {
    const id = await seedListing();

    const response = await request(app)
      .get(`/listings/${id}`)
      .query({ checkIn: '2026-08-10', checkOut: '2026-08-05' });

    expect(response.status).toBe(400);
  });
});
