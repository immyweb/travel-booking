import { randomUUID } from 'node:crypto';
import { bookings, listings, user } from '@travel-booking/api/src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { expect, test as base, type Page } from '@playwright/test';

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
async function signUpUser(user: {
  email: string;
  password: string;
  name: string;
}): Promise<string> {
  const response = await fetch('http://localhost:4000/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
    body: JSON.stringify(user),
  });
  if (!response.ok) {
    throw new Error(`sign-up/email failed: ${response.status} ${await response.text()}`);
  }

  const body: { user: { id: string } } = await response.json();
  return body.user.id;
}

// Fills and submits the Sign In form — shared by every test that signs in,
// whether it landed there via the app's own auth-gate redirect (already on
// the page) or navigated straight there with `gotoSignIn` below.
export async function signIn(
  page: Page,
  credentials: { email: string; password: string },
): Promise<void> {
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

// Navigates directly to Sign In with an in-progress booking path preserved
// as `redirect` — the same query param shape the app's own auth gate
// produces (see listings/[id]/book/page.tsx), for tests that don't need to
// re-drive the search/listing-detail navigation that produces it naturally.
export async function gotoSignIn(page: Page, redirectPath: string): Promise<void> {
  await page.goto(`/sign-in?redirect=${encodeURIComponent(redirectPath)}`);
}

// Asserts the inline form error's text. Scoped to `form`, not `page` — both
// the Sign In and Booking forms render their error as a `role="alert"` `<p>`
// inside the `<form>`, but Next.js's own route announcer div also has
// role="alert", which an unscoped getByRole would ambiguously match.
export async function expectFormAlert(page: Page, text: string): Promise<void> {
  await expect(page.locator('form').getByRole('alert')).toHaveText(text);
}

// Inserts a booking row directly — bypassing the real create-booking flow —
// for tests that need a pre-existing booking already in place (e.g. to
// trigger a real overlap conflict) without expressing this schema's shape
// by hand at each call site.
export async function seedBooking(
  db: ReturnType<typeof connectDb>,
  booking: typeof bookings.$inferInsert,
): Promise<void> {
  await db.insert(bookings).values(booking);
}

// Stripe's real CardElement (mounted against a live clientSecret — see #33,
// switched from PaymentElement in ADR-0011) renders its card fields inside a
// single cross-origin js.stripe.com iframe, mounted directly into the
// `#card-element` container PaymentStep.tsx gives it — no accordion tab to
// expand first, and no extra nesting level to search past. frameLocator
// scoped to that container id resolves it directly (with its own built-in
// wait for the frame to appear), unlike PaymentElement's nested
// elements-inner-accessory-target frame this used to need page.frames()
// hunting for. Stripe also injects several unrelated top-level iframes onto
// the page for its own fraud tooling (m-outer, hcaptcha, ...) — scoping by
// container avoids depending on knowing which of those to ignore.
export async function fillCardDetails(page: Page, cardNumber: string): Promise<void> {
  const cardFrame = page.frameLocator('#card-element iframe');
  await cardFrame.locator('input[name="cardnumber"]').fill(cardNumber);
  await cardFrame.locator('input[name="exp-date"]').fill('12/34');
  await cardFrame.locator('input[name="cvc"]').fill('123');
}

export async function payWithTestCard(page: Page, cardNumber: string): Promise<void> {
  await fillCardDetails(page, cardNumber);
  await page.getByRole('button', { name: 'Pay now' }).click();
}

export type BookingJourneyFixture = {
  listing: { id: string; title: string; price: number; currency: string; maxGuests: number };
  user: { id: string; email: string; password: string; name: string };
  // Exposes the same connection already open for fixture setup/teardown, so
  // tests that need to seed rows directly (e.g. a pre-existing booking to
  // trigger a real overlap conflict) don't need a second connection.
  db: ReturnType<typeof connectDb>;
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

    const userId = await signUpUser({ email: userEmail, password, name: userName });

    await use({
      listing: { id: listing.id, title: listing.title, price: 120, currency: 'EUR', maxGuests: 3 },
      user: { id: userId, email: userEmail, password, name: userName },
      db,
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

export { expect };
