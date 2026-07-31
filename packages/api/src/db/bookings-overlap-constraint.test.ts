// Proves the `bookings_no_overlapping_dates` EXCLUDE constraint (see
// drizzle/0004_bookings_no_overlap.sql) at the database level, with no API
// route or application-level check involved — the insert itself is rejected.
import { eq, inArray } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext } from '../test-support/context';
import { signUpSharedTestUser } from '../test-support/auth';
import { bookings, listings } from './schema';

const { app, db } = createTestContext();

const TEST_COUNTRY = 'BookingsOverlapConstraintTestland';

// Signed up once in beforeAll, not afterEach-cleaned, since every booking
// inserted in this file shares one account — these tests exercise the
// DB-level EXCLUDE constraint, not who a booking belongs to.
let testUserId: string;
let cleanupTestUser: () => Promise<void>;

beforeAll(async () => {
  ({ userId: testUserId, cleanup: cleanupTestUser } = await signUpSharedTestUser(
    app,
    db,
    'bookings-overlap-constraint-test.example',
  ));
});

afterAll(async () => {
  await cleanupTestUser();
});

async function seedListing() {
  const [row] = await db
    .insert(listings)
    .values({
      title: 'Constraint test studio',
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

function bookingValues(listingId: string, checkIn: string, checkOut: string) {
  return {
    listingId,
    userId: testUserId,
    checkIn,
    checkOut,
    guestName: 'Test Guest',
    guestEmail: 'test-guest@example.com',
    guests: 1,
    totalPrice: 100,
    currency: 'EUR',
  };
}

afterEach(async () => {
  const testListingIds = db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.country, TEST_COUNTRY));
  await db.delete(bookings).where(inArray(bookings.listingId, testListingIds));
  await db.delete(listings).where(eq(listings.country, TEST_COUNTRY));
});

describe('bookings EXCLUDE constraint', () => {
  it('rejects an insert whose dates overlap an existing booking for the same listing', async () => {
    const listingId = await seedListing();
    await db.insert(bookings).values(bookingValues(listingId, '2026-08-05', '2026-08-10'));

    await expect(
      db.insert(bookings).values(bookingValues(listingId, '2026-08-07', '2026-08-12')),
    ).rejects.toThrow();
  });

  it('allows a second booking for the same listing with non-overlapping dates', async () => {
    const listingId = await seedListing();
    await db.insert(bookings).values(bookingValues(listingId, '2026-08-05', '2026-08-10'));

    await expect(
      db.insert(bookings).values(bookingValues(listingId, '2026-08-10', '2026-08-15')),
    ).resolves.not.toThrow();
  });

  it('allows the same/overlapping dates for a different listing', async () => {
    const listingId1 = await seedListing();
    const listingId2 = await seedListing();
    await db.insert(bookings).values(bookingValues(listingId1, '2026-08-05', '2026-08-10'));

    await expect(
      db.insert(bookings).values(bookingValues(listingId2, '2026-08-05', '2026-08-10')),
    ).resolves.not.toThrow();
  });
});
