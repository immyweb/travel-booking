import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { listings } from '../../schema';
import { createTestContext } from '../../test-support/context';

const { app, db } = createTestContext();

// Isolated from real curated/seed data by a marker country no seed listing uses.
const TEST_COUNTRY = 'Testland';

// London-ish centroid; offsets below use ~111.32km per degree of latitude.
const CENTER = { lat: 51.5074, lng: -0.1278 };

function pointAtKm(km: number) {
  return { lat: CENTER.lat + km / 111.32, lng: CENTER.lng };
}

async function seedListing(overrides: { distanceKm: number; title?: string }) {
  const point = pointAtKm(overrides.distanceKm);
  const [row] = await db
    .insert(listings)
    .values({
      title: overrides.title ?? `Listing ${overrides.distanceKm}km out`,
      price: 100,
      currency: 'GBP',
      maxGuests: 2,
      amenities: ['wifi'],
      city: 'London',
      country: TEST_COUNTRY,
      location: { latitude: point.lat, longitude: point.lng },
      images: ['https://example.com/img.jpg'],
    })
    .returning({ id: listings.id });

  return row!.id;
}

afterEach(async () => {
  await db.delete(listings).where(eq(listings.country, TEST_COUNTRY));
});

describe('GET /search', () => {
  it('returns 400 when lat/lng are missing', async () => {
    const response = await request(app).get('/search').query({ radiusKm: 10 });

    expect(response.status).toBe(400);
  });

  it('includes listings within the radius and excludes listings outside it', async () => {
    const inRadiusId = await seedListing({ distanceKm: 2 });
    const outOfRadiusId = await seedListing({ distanceKm: 20 });

    const response = await request(app).get('/search').query({
      lat: CENTER.lat,
      lng: CENTER.lng,
      radiusKm: 10,
      country: TEST_COUNTRY,
    });

    expect(response.status).toBe(200);
    const ids = response.body.results.map((result: { id: string }) => result.id);
    expect(ids).toContain(inRadiusId);
    expect(ids).not.toContain(outOfRadiusId);
  });

  it('sorts results by ascending distance from the search center', async () => {
    await seedListing({ distanceKm: 9, title: 'Farthest' });
    await seedListing({ distanceKm: 1, title: 'Closest' });
    await seedListing({ distanceKm: 5, title: 'Middle' });

    const response = await request(app).get('/search').query({
      lat: CENTER.lat,
      lng: CENTER.lng,
      radiusKm: 10,
      country: TEST_COUNTRY,
    });

    expect(response.status).toBe(200);
    expect(response.body.results.map((result: { title: string }) => result.title)).toEqual([
      'Closest',
      'Middle',
      'Farthest',
    ]);
  });

  it('paginates results with correct totals and slices', async () => {
    for (let km = 1; km <= 5; km++) {
      await seedListing({ distanceKm: km, title: `Listing ${km}` });
    }

    const response = await request(app).get('/search').query({
      lat: CENTER.lat,
      lng: CENTER.lng,
      radiusKm: 10,
      country: TEST_COUNTRY,
      page: 2,
      size: 2,
    });

    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({
      page: 2,
      size: 2,
      total: 5,
      totalPages: 3,
    });
    expect(response.body.results.map((result: { title: string }) => result.title)).toEqual([
      'Listing 3',
      'Listing 4',
    ]);
  });
});

describe('GET /search/cities', () => {
  it('averages each curated city into a single centroid', async () => {
    await db.insert(listings).values([
      {
        title: 'North point',
        price: 100,
        currency: 'GBP',
        maxGuests: 2,
        amenities: ['wifi'],
        city: 'Testville',
        country: TEST_COUNTRY,
        location: { latitude: 52.0, longitude: 0 },
        images: ['https://example.com/img.jpg'],
      },
      {
        title: 'South point',
        price: 100,
        currency: 'GBP',
        maxGuests: 2,
        amenities: ['wifi'],
        city: 'Testville',
        country: TEST_COUNTRY,
        location: { latitude: 50.0, longitude: 0 },
        images: ['https://example.com/img.jpg'],
      },
    ]);

    const response = await request(app).get('/search/cities');

    expect(response.status).toBe(200);
    const testville = response.body.cities.find(
      (city: { city: string }) => city.city === 'Testville',
    );
    expect(testville.coordinates.latitude).toBeCloseTo(51.0, 5);
    expect(testville.coordinates.longitude).toBeCloseTo(0, 5);
  });
});
