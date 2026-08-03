import { expect, test } from '../src/fixtures';

function isoDateDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

test('search, sign in, and book a stay end to end', async ({ page, bookingJourney }) => {
  const { listing, user } = bookingJourney;
  const checkIn = isoDateDaysFromNow(30);
  const checkOut = isoDateDaysFromNow(33);

  // Search: land directly on the marker listing's already-seeded city rather
  // than operating the "Where to?" picker — see fixtures.ts for why (the
  // picker's own city list is cached for 5 minutes, the results list isn't).
  await page.goto('/search?city=Lisbon&country=Portugal');
  await page.getByRole('link', { name: listing.title }).click();

  // Listing detail
  await expect(page.getByRole('heading', { name: listing.title })).toBeVisible();
  await page.getByRole('link', { name: 'Book now' }).click();

  // Booking is gated behind auth: redirected to sign-in with the in-progress
  // booking path preserved as `redirect`.
  await expect(page).toHaveURL(/\/sign-in\?redirect=/);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Back on the booking form, signed in, with contact fields prefilled from
  // the session (see commit a41ddcc).
  await expect(page).toHaveURL(new RegExp(`/listings/${listing.id}/book$`));
  await expect(page.getByRole('heading', { name: 'Confirm your booking' })).toBeVisible();
  await expect(page.getByLabel('Full name')).toHaveValue(user.name);
  await expect(page.getByLabel('Email')).toHaveValue(user.email);

  await page.getByLabel('Check-in').fill(checkIn);
  await page.getByLabel('Check-out').fill(checkOut);
  await page.getByLabel('Guests').fill('2');
  await page.getByRole('button', { name: 'Confirm booking' }).click();

  // Confirmation. Scoped to `main`, not `page` — the signed-in user's own
  // name/email also render in the header nav, so an unscoped getByText would
  // ambiguously match both that and the guest details below.
  await expect(page).toHaveURL(/\/bookings\/[^/]+$/);
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Booking confirmed' })).toBeVisible();
  await expect(main.getByText(listing.title)).toBeVisible();
  await expect(main.getByText(`${checkIn} – ${checkOut} · 3 nights`)).toBeVisible();
  await expect(main.getByText(user.name)).toBeVisible();
  await expect(main.getByText(user.email)).toBeVisible();
});
