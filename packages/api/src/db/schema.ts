import { AMENITIES } from '@travel-booking/core';
import { sql } from 'drizzle-orm';
import {
  customType,
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
