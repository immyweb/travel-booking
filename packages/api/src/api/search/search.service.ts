// The Search slice's reads. These query the listings table but belong to
// Search, not to Listing — a Listing detail read (GET /listings/:id) is a
// separate slice with its own queries.
import type { CityCentroid, ListingSummary, SearchQuery } from '@travel-booking/core';
import { and, arrayContains, eq, gte, sql } from 'drizzle-orm';
import type { Db } from '../../db/db';
import { bookings, listings } from '../../db/schema';

export type SearchListingsResult = {
  results: ListingSummary[];
  total: number;
};

export async function searchListings(db: Db, query: SearchQuery): Promise<SearchListingsResult> {
  const { lat, lng, radiusKm, country, checkIn, checkOut, guests, amenities, page, size } = query;
  const radiusMeters = radiusKm * 1000;
  const center = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
  const distanceKm = sql<number>`ST_Distance(${listings.location}, ${center}) / 1000`;

  const conditions = [sql`ST_DWithin(${listings.location}, ${center}, ${radiusMeters})`];
  if (country) {
    conditions.push(eq(listings.country, country));
  }
  if (guests) {
    conditions.push(gte(listings.maxGuests, guests));
  }
  if (amenities) {
    // `@>` (array contains): every selected amenity must be present, i.e. AND
    // semantics rather than the "any of" arrayOverlaps would give.
    conditions.push(arrayContains(listings.amenities, amenities));
  }
  if (checkIn && checkOut) {
    // Check-in inclusive, check-out exclusive: an existing booking blocks the
    // requested range only if it truly overlaps, so a checkout on day X
    // doesn't block a new check-in on day X.
    conditions.push(sql`NOT EXISTS (
      SELECT 1 FROM ${bookings}
      WHERE ${bookings.listingId} = ${listings.id}
        AND ${bookings.checkIn} < ${checkOut}
        AND ${bookings.checkOut} > ${checkIn}
    )`);
  }
  const where = and(...conditions);

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: listings.id,
        title: listings.title,
        images: listings.images,
        price: listings.price,
        currency: listings.currency,
        latitude: sql<number>`ST_Y(${listings.location}::geometry)`,
        longitude: sql<number>`ST_X(${listings.location}::geometry)`,
        distanceKm,
      })
      .from(listings)
      .where(where)
      .orderBy(distanceKm)
      .limit(size)
      .offset((page - 1) * size),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(listings)
      .where(where),
  ]);

  return {
    total: countRows[0]?.count ?? 0,
    results: rows.map(({ latitude, longitude, ...row }) => ({
      ...row,
      coordinates: { latitude, longitude },
    })),
  };
}

// Averaged from current listings at query time, so it stays correct as the
// curated catalog grows rather than being a hand-maintained list.
export async function getCityCentroids(db: Db): Promise<CityCentroid[]> {
  const rows = await db
    .select({
      city: listings.city,
      country: listings.country,
      latitude: sql<number>`AVG(ST_Y(${listings.location}::geometry))`,
      longitude: sql<number>`AVG(ST_X(${listings.location}::geometry))`,
    })
    .from(listings)
    .groupBy(listings.city, listings.country)
    .orderBy(listings.city);

  return rows.map(({ latitude, longitude, ...row }) => ({
    ...row,
    coordinates: { latitude, longitude },
  }));
}
