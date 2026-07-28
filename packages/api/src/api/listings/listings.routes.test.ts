import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { listings } from '../../db/schema';
import { createTestContext } from '../../test-support/context';

const { app, db } = createTestContext();

// Isolated from real curated/seed data — and from other test files' own marker
// countries, since test files run as separate processes against the same
// database — by a marker country unique to this file.
const TEST_COUNTRY = 'ListingDetailTestland';

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

afterEach(async () => {
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
});
