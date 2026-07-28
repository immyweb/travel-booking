import type { Amenity } from '@travel-booking/core';
import { configFromEnv } from '../src/config/config';
import { createDb, type Db } from '../src/db/db';
import { listings } from '../src/db/schema';

type SeedListing = {
  title: string;
  price: number;
  currency: string;
  maxGuests: number;
  amenities: Amenity[];
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  images: string[];
};

// Lorem Picsum: real stock photos, no API key, deterministic per seed string —
// reliable imagery for curated seed data (replaces the old
// images.travel-booking.example placeholder, which never resolved to anything).
function picsumImages(seedPrefix: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `https://picsum.photos/seed/${seedPrefix}-${index + 1}/1200/800`,
  );
}

// Curated (seed-only) supply spanning multiple cities/countries, so search
// radius and centroid resolution have real, varied data to work against.
const SEED_LISTINGS: SeedListing[] = [
  {
    title: 'Sunny Alfama studio',
    price: 82,
    currency: 'EUR',
    maxGuests: 2,
    amenities: ['wifi', 'kitchen'],
    city: 'Lisbon',
    country: 'Portugal',
    latitude: 38.7127,
    longitude: -9.1288,
    images: picsumImages('alfama-studio', 3),
  },
  {
    title: 'Belém riverside loft',
    price: 118,
    currency: 'EUR',
    maxGuests: 4,
    amenities: ['wifi', 'washer', 'parking'],
    city: 'Lisbon',
    country: 'Portugal',
    latitude: 38.6971,
    longitude: -9.2033,
    images: picsumImages('belem-loft', 2),
  },
  {
    title: 'Príncipe Real townhouse',
    price: 145,
    currency: 'EUR',
    maxGuests: 6,
    amenities: ['wifi', 'kitchen', 'washer', 'pool'],
    city: 'Lisbon',
    country: 'Portugal',
    latitude: 38.7183,
    longitude: -9.1502,
    images: picsumImages('principe-real-townhouse', 4),
  },
  {
    title: 'Chiado penthouse',
    price: 210,
    currency: 'EUR',
    maxGuests: 3,
    amenities: ['wifi', 'breakfast_provided', 'pool'],
    city: 'Lisbon',
    country: 'Portugal',
    latitude: 38.7107,
    longitude: -9.1425,
    // Single-image edge case — the gallery/carousel should still render
    // cleanly with no prev/next controls when there's nothing to page through.
    images: picsumImages('chiado-penthouse', 1),
  },
  {
    title: 'Graça hillside flat',
    price: 76,
    currency: 'EUR',
    maxGuests: 2,
    amenities: ['wifi', 'kitchen'],
    city: 'Lisbon',
    country: 'Portugal',
    latitude: 38.7159,
    longitude: -9.1289,
    images: picsumImages('graca-flat', 2),
  },
  {
    title: 'Baixa boutique room',
    price: 64,
    currency: 'EUR',
    maxGuests: 1,
    amenities: ['wifi', 'breakfast_provided'],
    city: 'Lisbon',
    country: 'Portugal',
    latitude: 38.7092,
    longitude: -9.1364,
    images: picsumImages('baixa-room', 1),
  },
  {
    title: 'Cascais beach cottage',
    price: 165,
    currency: 'EUR',
    maxGuests: 5,
    amenities: ['wifi', 'parking', 'washer'],
    city: 'Cascais',
    country: 'Portugal',
    latitude: 38.6979,
    longitude: -9.4215,
    images: picsumImages('cascais-cottage', 3),
  },
  {
    title: 'Sintra forest cabin',
    price: 98,
    currency: 'EUR',
    maxGuests: 4,
    amenities: ['wifi', 'kitchen', 'parking'],
    city: 'Sintra',
    country: 'Portugal',
    latitude: 38.8029,
    longitude: -9.3817,
    images: picsumImages('sintra-cabin', 2),
  },
  {
    title: 'Le Marais loft',
    price: 195,
    currency: 'EUR',
    maxGuests: 4,
    amenities: ['wifi', 'kitchen', 'washer'],
    city: 'Paris',
    country: 'France',
    latitude: 48.8606,
    longitude: 2.3622,
    images: picsumImages('marais-loft', 4),
  },
  {
    title: 'Montmartre artist studio',
    price: 110,
    currency: 'EUR',
    maxGuests: 2,
    amenities: ['wifi', 'breakfast_provided'],
    city: 'Paris',
    country: 'France',
    latitude: 48.8867,
    longitude: 2.3431,
    images: picsumImages('montmartre-studio', 2),
  },
  {
    title: 'Latin Quarter pied-à-terre',
    price: 140,
    currency: 'EUR',
    maxGuests: 3,
    amenities: ['wifi', 'kitchen', 'pool'],
    city: 'Paris',
    country: 'France',
    latitude: 48.8462,
    longitude: 2.3459,
    images: picsumImages('latin-quarter', 3),
  },
];

// Destructive: replaces the whole listings table.
export async function seed(db: Db) {
  console.log(`Seeding ${SEED_LISTINGS.length} listings...`);

  await db.delete(listings);
  await db.insert(listings).values(
    SEED_LISTINGS.map(({ latitude, longitude, ...listing }) => ({
      ...listing,
      location: { latitude, longitude },
    })),
  );

  console.log('Done.');
}

// Only runs when this file is the process entry point. Previously a top-level
// await, so merely importing this module wiped the listings table.
if (import.meta.main) {
  await seed(createDb(configFromEnv().db.url));
}
