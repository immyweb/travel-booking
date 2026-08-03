import { expect, expectFormAlert, gotoSignIn, seedBooking, signIn, test } from '../src/fixtures';

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
  await signIn(page, user);

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

test('shows an error and recovers when signing in with the wrong password', async ({
  page,
  bookingJourney,
}) => {
  const { listing, user } = bookingJourney;
  const bookingPath = `/listings/${listing.id}/book`;

  await gotoSignIn(page, bookingPath);
  await signIn(page, { email: user.email, password: 'the-wrong-password' });

  // Better Auth rejects the credentials; the form stays put with an inline
  // error rather than navigating anywhere (see sign-in/_actions.ts).
  await expect(page).toHaveURL(/\/sign-in\?redirect=/);
  await expectFormAlert(page, 'Invalid email or password');

  // Recover: the failed attempt doesn't leave the form stuck — retrying with
  // the correct password still reaches the booking form as normal.
  await signIn(page, user);

  await expect(page).toHaveURL(new RegExp(`${bookingPath}$`));
  await expect(page.getByRole('heading', { name: 'Confirm your booking' })).toBeVisible();
});

test('shows a conflict error and recovers when booking dates overlap an existing booking', async ({
  page,
  bookingJourney,
}) => {
  const { listing, user, db } = bookingJourney;

  // A pre-existing booking for this listing, seeded directly rather than
  // through the UI — the #16 EXCLUDE constraint (bookings_no_overlapping_dates)
  // rejects an overlapping insert regardless of how the existing row got
  // there, so this is a real conflict, not a mocked one.
  await seedBooking(db, {
    listingId: listing.id,
    userId: user.id,
    checkIn: isoDateDaysFromNow(40),
    checkOut: isoDateDaysFromNow(43),
    guestName: user.name,
    guestEmail: user.email,
    guests: 2,
    totalPrice: listing.price * 3,
    currency: listing.currency,
  });

  await gotoSignIn(page, `/listings/${listing.id}/book`);
  await signIn(page, user);
  await expect(page).toHaveURL(new RegExp(`/listings/${listing.id}/book$`));

  // A one-night overlap with the seeded booking's tail end — a partial
  // overlap, not an exact-duplicate range, to prove this is a real range
  // check rather than a same-dates check.
  await page.getByLabel('Check-in').fill(isoDateDaysFromNow(42));
  await page.getByLabel('Check-out').fill(isoDateDaysFromNow(45));
  await page.getByLabel('Guests').fill('2');
  await page.getByRole('button', { name: 'Confirm booking' }).click();

  await expect(page).toHaveURL(new RegExp(`/listings/${listing.id}/book$`));
  await expectFormAlert(page, 'Sorry, these dates are no longer available for this listing.');

  // Recover: dates clear of the existing booking still succeed.
  await page.getByLabel('Check-in').fill(isoDateDaysFromNow(50));
  await page.getByLabel('Check-out').fill(isoDateDaysFromNow(53));
  await page.getByRole('button', { name: 'Confirm booking' }).click();

  await expect(page).toHaveURL(/\/bookings\/[^/]+$/);
});
