import { AMENITIES } from '@travel-booking/core';
import { sql } from 'drizzle-orm';
import {
  customType,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export type GeographyPoint = { latitude: number; longitude: number };

// PostGIS `geography(Point, 4326)` — not a type drizzle-orm ships natively,
// so reads always go through computed SQL (ST_X/ST_Y, ST_DWithin, ST_Distance)
// rather than this column's driver mapping.
const geographyPoint = customType<{ data: GeographyPoint; driverData: string }>({
  dataType() {
    return 'geography(Point, 4326)';
  },
  toDriver(value) {
    return sql`ST_SetSRID(ST_MakePoint(${value.longitude}, ${value.latitude}), 4326)`;
  },
});

export const amenityEnum = pgEnum('amenity', AMENITIES);

export const listings = pgTable(
  'listings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    price: integer('price').notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    maxGuests: integer('max_guests').notNull(),
    amenities: amenityEnum('amenities').array().notNull(),
    city: text('city').notNull(),
    country: text('country').notNull(),
    location: geographyPoint('location').notNull(),
    images: text('images').array().notNull(),
  },
  (table) => [index('listings_location_idx').using('gist', table.location)],
);

// Guest details/price captured additively (see the Booking feature's own
// spec) rather than in a new table. Overlap-safety for concurrent bookings on
// the same listing is enforced by a hand-written EXCLUDE constraint (see
// drizzle/0004_bookings_no_overlap.sql) — drizzle-orm has no schema DSL for it,
// so it isn't modeled here.
export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id),
    checkIn: date('check_in', { mode: 'string' }).notNull(),
    checkOut: date('check_out', { mode: 'string' }).notNull(),
    guestName: text('guest_name').notNull(),
    guestEmail: text('guest_email').notNull(),
    guests: integer('guests').notNull(),
    totalPrice: integer('total_price').notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
  },
  (table) => [index('bookings_listing_id_idx').on(table.listingId)],
);
