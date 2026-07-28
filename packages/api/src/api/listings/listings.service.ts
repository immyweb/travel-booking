// The Listing Detail slice's reads. A single-listing read is a different
// concern from Search's multi-row query (see search.service.ts's own header
// comment), so this stays a separate slice rather than folding in there.
import type { ListingDetail } from '@travel-booking/core';
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../../db/db';
import { listings } from '../../db/schema';

export async function getListingById(db: Db, id: string): Promise<ListingDetail | null> {
  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      images: listings.images,
      price: listings.price,
      currency: listings.currency,
      maxGuests: listings.maxGuests,
      amenities: listings.amenities,
      city: listings.city,
      country: listings.country,
      latitude: sql<number>`ST_Y(${listings.location}::geometry)`,
      longitude: sql<number>`ST_X(${listings.location}::geometry)`,
    })
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  const { latitude, longitude, ...rest } = row;
  return {
    ...rest,
    coordinates: { latitude, longitude },
    // Date-based availability is a separate, later extension of this slice.
    availability: null,
  };
}
