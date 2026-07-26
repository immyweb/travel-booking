// The Search slice's reads. These query the listings table but belong to
// Search, not to Listing — a Listing detail read (GET /listings/:id) is a
// separate slice with its own queries.
import type { CityCentroid, ListingSummary, SearchQuery } from '@travel-booking/core';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { listings } from '../../schema';

export type SearchListingsResult = {
  results: ListingSummary[];
  total: number;
};

export async function searchListings(query: SearchQuery): Promise<SearchListingsResult> {
  const { lat, lng, radiusKm, country, page, size } = query;
  const radiusMeters = radiusKm * 1000;
  const center = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
  const distanceKm = sql<number>`ST_Distance(${listings.location}, ${center}) / 1000`;

  const conditions = [sql`ST_DWithin(${listings.location}, ${center}, ${radiusMeters})`];
  if (country) {
    conditions.push(eq(listings.country, country));
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
export async function getCityCentroids(): Promise<CityCentroid[]> {
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
