// The Listing Detail slice's reads. A single-listing read is a different
// concern from Search's multi-row query (see search.service.ts's own header
// comment), so this stays a separate slice rather than folding in there.
import type { Availability, ListingDetail } from '@travel-booking/core';
import { and, eq, sql } from 'drizzle-orm';
import { bookingOverlapsRange } from '../../db/booking-overlap';
import type { Db } from '../../db/db';
import { bookings, listings } from '../../db/schema';

const MS_PER_NIGHT = 24 * 60 * 60 * 1000;

async function computeAvailability(
  db: Db,
  listingId: string,
  price: number,
  checkIn: string,
  checkOut: string,
): Promise<Availability> {
  const overlapping = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.listingId, listingId), bookingOverlapsRange(checkIn, checkOut)))
    .limit(1);

  const nights = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / MS_PER_NIGHT,
  );

  return {
    checkIn,
    checkOut,
    available: overlapping.length === 0,
    nights,
    totalPrice: nights * price,
  };
}

export async function getListingById(
  db: Db,
  id: string,
  dates?: { checkIn: string; checkOut: string },
): Promise<ListingDetail | null> {
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
    availability: dates
      ? await computeAvailability(db, id, row.price, dates.checkIn, dates.checkOut)
      : null,
  };
}
