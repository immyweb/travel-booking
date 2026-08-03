import { randomUUID } from 'node:crypto';
import { bookings, listings, user } from '@travel-booking/api/src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { test as base } from '@playwright/test';

// A real listing/user pair, isolated per test by a title/email unique to
// this run — same "own marker data, not the global seed" convention
// packages/api's own integration tests use (see listings.routes.test.ts),
// just reached from a separate package since packages/web has no dependency
// on packages/api's internals (ADR-0006).
//
// Placed under Lisbon/Portugal — an already-seeded city — rather than a
// brand-new marker country: the "Where to?" picker's city list
// (GET /search/cities) is revalidated only every 5 minutes
// (lib/api.ts's fetchCities), so a fresh, never-seen country wouldn't
// reliably show up in time for the test to select it. Search's actual
// results list (GET /search) is always fetched live (`cache: 'no-store'`),
// so the marker listing itself still shows up immediately once inserted.
const MARKER_CITY = 'Lisbon';
const MARKER_COUNTRY = 'Portugal';

// The api package's own `createDb` uses Bun's built-in `bun:sql` driver, but
// Playwright's test workers run under plain Node even when the CLI itself is
// launched via `bun playwright test` — importing that module here fails with
// "Cannot find package 'bun'". `drizzle-orm/postgres-js` talks to the same
// Postgres over the same DATABASE_URL and works from Node, so fixture setup
// uses that instead; only the table definitions (driver-agnostic pgTable
// schemas) are shared with the api package.
function connectDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — start Postgres with `bun run db:up`');
  }
  return drizzle(postgres(url));
}

// Creates the throwaway user via the real running API (started by this
// config's webServer) rather than calling Better Auth's signup in-process —
// same reasoning as connectDb above, and it means fixture setup exercises
// the exact endpoint the browser itself would hit, same as
// packages/api/src/test-support/auth.ts's signUpTestUser.
async function signUpUser(user: { email: string; password: string; name: string }) {
  const response = await fetch('http://localhost:4000/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
    body: JSON.stringify(user),
  });
  if (!response.ok) {
    throw new Error(`sign-up/email failed: ${response.status} ${await response.text()}`);
  }
}

export type BookingJourneyFixture = {
  listing: { id: string; title: string; price: number; currency: string; maxGuests: number };
  user: { email: string; password: string; name: string };
};

export const test = base.extend<{ bookingJourney: BookingJourneyFixture }>({
  // eslint-disable-next-line no-empty-pattern
  bookingJourney: async ({}, use) => {
    const db = connectDb();

    const marker = randomUUID();
    const listingTitle = `E2E Booking Journey Listing ${marker}`;
    const userEmail = `e2e-booking-journey-${marker}@example.com`;
    const password = 'password123';
    const userName = 'E2E Traveler';

    const [listing] = await db
      .insert(listings)
      .values({
        title: listingTitle,
        price: 120,
        currency: 'EUR',
        maxGuests: 3,
        amenities: ['wifi'],
        city: MARKER_CITY,
        country: MARKER_COUNTRY,
        location: { latitude: 38.7169, longitude: -9.1399 },
        images: [`https://picsum.photos/seed/e2e-${marker}/1200/800`],
      })
      .returning({ id: listings.id, title: listings.title });
    if (!listing) {
      throw new Error('bookingJourney fixture: listing insert returned no row');
    }

    await signUpUser({ email: userEmail, password, name: userName });

    await use({
      listing: { id: listing.id, title: listing.title, price: 120, currency: 'EUR', maxGuests: 3 },
      user: { email: userEmail, password, name: userName },
    });

    // Bookings reference listings/users with a plain FK (no ON DELETE
    // CASCADE — see schema.ts), so they're deleted first, then the listing,
    // then the user directly (its own session/account rows do cascade —
    // see auth-schema.ts — matching signUpSharedTestUser's cleanup convention).
    await db.delete(bookings).where(eq(bookings.listingId, listing.id));
    await db.delete(listings).where(eq(listings.id, listing.id));
    await db.delete(user).where(eq(user.email, userEmail));
  },
});

export { expect } from '@playwright/test';
