import type { Amenity } from '@travel-booking/core';
import { createDb, databaseUrlFromEnv, type Db } from '../src/db';
import { listings } from '../src/schema';

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

const PLACEHOLDER_IMAGE = 'https://images.travel-booking.example/listing.jpg';

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
    images: [PLACEHOLDER_IMAGE],
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
    images: [PLACEHOLDER_IMAGE],
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
    images: [PLACEHOLDER_IMAGE],
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
    images: [PLACEHOLDER_IMAGE],
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
    images: [PLACEHOLDER_IMAGE],
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
    images: [PLACEHOLDER_IMAGE],
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
    images: [PLACEHOLDER_IMAGE],
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
    images: [PLACEHOLDER_IMAGE],
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
    images: [PLACEHOLDER_IMAGE],
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
    images: [PLACEHOLDER_IMAGE],
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
    images: [PLACEHOLDER_IMAGE],
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
  await seed(createDb(databaseUrlFromEnv()));
}
