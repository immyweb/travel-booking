import type { Amenity } from '@travel-booking/core';
import { createAuth, type Auth } from '../src/auth/auth';
import { configFromEnv } from '../src/config/config';
import { user } from '../src/db/auth-schema';
import { createDb, type Db } from '../src/db/db';
import { bookings, listings } from '../src/db/schema';
import { nightsBetween } from '../src/pricing/nights';

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

type SeedUser = { email: string; password: string; name: string };

// Well-known email/password so a developer can sign in locally and see real
// bookings under "My Bookings" (#29) without registering their own account.
const SEED_USERS: SeedUser[] = [
  { email: 'alice@example.com', password: 'password123', name: 'Alice Traveler' },
  { email: 'bob@example.com', password: 'password123', name: 'Bob Explorer' },
];

type SeedBooking = {
  userEmail: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestEmail: string;
};

// Referenced by listingTitle/userEmail rather than id, since both are only
// assigned once SEED_LISTINGS/SEED_USERS are actually inserted below.
const SEED_BOOKINGS: SeedBooking[] = [
  {
    userEmail: 'alice@example.com',
    listingTitle: 'Sunny Alfama studio',
    checkIn: '2026-09-10',
    checkOut: '2026-09-14',
    guests: 2,
    guestName: 'Alice Traveler',
    guestEmail: 'alice@example.com',
  },
  {
    userEmail: 'alice@example.com',
    listingTitle: 'Le Marais loft',
    checkIn: '2026-10-01',
    checkOut: '2026-10-05',
    guests: 3,
    // Booking on someone else's behalf — the account books, the named guest
    // (not registered here) is who actually stays.
    guestName: 'Charlie Guest',
    guestEmail: 'charlie@example.com',
  },
  {
    userEmail: 'bob@example.com',
    listingTitle: 'Cascais beach cottage',
    checkIn: '2026-08-20',
    checkOut: '2026-08-23',
    guests: 4,
    guestName: 'Bob Explorer',
    guestEmail: 'bob@example.com',
  },
];

// Destructive: replaces the whole listings/bookings/user tables. Per #28's
// confirmed decision there's no migration path for backfilling userId onto
// pre-existing bookings, so dev/seed data is wiped and reseeded instead.
// Deleting `user` cascades onto Better Auth's own session/account rows
// (see auth-schema.ts's `onDelete: 'cascade'`).
export async function seed(db: Db, auth: Auth) {
  console.log(`Seeding ${SEED_LISTINGS.length} listings...`);

  await db.delete(bookings);
  await db.delete(listings);
  await db.delete(user);

  const insertedListings = await db
    .insert(listings)
    .values(
      SEED_LISTINGS.map(({ latitude, longitude, ...listing }) => ({
        ...listing,
        location: { latitude, longitude },
      })),
    )
    .returning({ id: listings.id, title: listings.title });
  const listingIdByTitle = new Map(insertedListings.map((listing) => [listing.title, listing.id]));

  console.log(`Seeding ${SEED_USERS.length} users...`);
  const userIdByEmail = new Map<string, string>();
  for (const seedUser of SEED_USERS) {
    const { user: createdUser } = await auth.api.signUpEmail({ body: seedUser });
    userIdByEmail.set(seedUser.email, createdUser.id);
  }

  console.log(`Seeding ${SEED_BOOKINGS.length} bookings...`);
  await db.insert(bookings).values(
    SEED_BOOKINGS.map((booking) => {
      const listingId = listingIdByTitle.get(booking.listingTitle);
      const listing = SEED_LISTINGS.find((candidate) => candidate.title === booking.listingTitle);
      if (!listingId || !listing) {
        throw new Error(`Seed booking references unknown listing "${booking.listingTitle}"`);
      }
      const userId = userIdByEmail.get(booking.userEmail);
      if (!userId) {
        throw new Error(`Seed booking references unknown user "${booking.userEmail}"`);
      }

      return {
        listingId,
        userId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: booking.guests,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        totalPrice: nightsBetween(booking.checkIn, booking.checkOut) * listing.price,
        currency: listing.currency,
      };
    }),
  );

  console.log('Done.');
}

// Only runs when this file is the process entry point. Previously a top-level
// await, so merely importing this module wiped the listings table.
if (import.meta.main) {
  const config = configFromEnv();
  const db = createDb(config.db.url);
  const auth = createAuth({
    db,
    secret: config.auth.secret,
    baseUrl: config.auth.baseUrl,
    webAppUrl: config.webAppUrl,
  });

  await seed(db, auth);
}
