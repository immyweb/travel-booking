# Travel Booking

I want to build a travel booking website that allows users to search for listings and make a booking.

## Requirements

### What are the core user journeys?

- Search and browse listings.
- View listing details such as price, location, photos and amenities.
- Make bookings for listings.
- Receive a booking confirmation email.

### Who are the users?

- International users of a wide age range: US, Europe for now.

### Device support

- Should be responsive and support all possible devices (mobile, tablet, desktop)

### Do users have be signed in?

- Anyone can browse the listings and details, but need to be signed in to make bookings.

### Non-functional requirments

- Strong SEO
- Should have excellent performance (Lighthouse scores)
- Should be fully accessible.

## High-level design

Public pages must rank well in search engines.
Users may compare listings in parallel.

### Rendering architecture

Since performance and SEO are critical, server-side rendering is the preferred choice for public, crawlable pages.
Server renders full HTML for every request. The user gets a complete page instantly and then JS hydrates for interactivity.
SSR with hydration for public listings and search pages.

This requirement is scoped to public pages only. Authenticated pages (booking/checkout flow, and any future account dashboard) are not indexed and do not need first-byte HTML for SEO, so they may use a simpler client-rendered/SPA-like approach instead.

### Page architecture

The most important thing is SSR with hydration is used for public pages.
For authenticated pages, SPA and MPA does not matter so much.

### Product architecture

Frontend will use monolith architecture.
The app (frontend plus backend) will use monorepo structure

- easier to share types, schemas, libraries across stack
- single PR when building features
- shared tooling (eslint, prettier, testing)
- AI agents perform better (full context, better understanding of architecture)

### APIs

- REST APIs will be used for backend.

### Data processing

- Search and filtering will be done server-side for performance reasons.

## Data model

### Search Params

- Source: User input (client)
- Belongs to: Search/Listing page
- Fields: City/Geolocation/Radius, check_in, check_out, guests, amenities, etc.

### ListingResults

- Source: Server
- Belongs to: Search/Listing page
- Fields: results (list of ListingItems), pagination (pagination metadata)

### ListingItem

- Source: Server
- Belongs to: Search/Listing page, Details page.
- Fields: title, price, currency, image_urls, amenities

## Entities

### listing

id (string)
title (string)
price (number)
currency (string)
imageUrls (string[])
amenities (object)

`price`/`currency` are the canonical values, set by the host and charged as-is — no currency conversion in v1 (see [ADR-0001](./adr/0001-charge-in-listing-native-currency.md)).

### location

latitude (number)
longitude (number)
city (string)
country (string)

### review (future scope)

Not in scope for this version — no user journey covers viewing or leaving reviews yet.

id (string)
rating (number)
body (string)

### host (future scope)

Not in scope for this version — no user journey covers viewing host details yet.

id (string)
name (string)
isSuperHost (boolean)

### availability_calendar (future scope)

Not in scope for this version — search does not yet check date availability against bookings.

listingId (string)
bookedDates (string[])
minNights (number)

### user

id (string)
name (string)
country (string)

### booking

id (string)
listingId (string)
userId (string)
checkIn (string)
checkOut (string)
guests (number)
guestName (string)
guestEmail (string)
nights (number)
totalPrice (number)
currency (string)
status (string - `pending` or `confirmed`, see [ADR-0013](./adr/0013-two-phase-pending-confirmed-booking-flow.md))

### payment_details

card_last_four_digits (string)

Captured server-side once a Booking is confirmed (from the Stripe PaymentIntent's payment method), but not currently returned by any API response or shown in the UI — a gap against the "see the card I paid with" user story, left as a known follow-up rather than fixed as part of documenting the booking/payment flow (#34).

## API

### Search listings

GET
`/search`
Returns a list of listings that match the search query

#### Parameters

Size (number)
Page (number)
Guests (number)
Country (string)
Location (center position + radius)
Date range (seperate query parameters - `check_in` and `check_out`)
Amenities (object - `{ breakfast_provided: true, washer: true }`)

#### Sample response

```json
{
  // Pagination metadata.
  "pagination": {
    "size": 5,
    "page": 2,
    "total_pages": 15,
    "total": 74
  },
  "results": [
    {
      "id": "561602", // Listing ID.
      "title": "Great view in the Mission, 15 mins by bus downtown",
      "images": [
        "https://www.greathotels.com/img/1.jpg",
        "https://www.greathotels.com/img/2.jpg",
        "https://www.greathotels.com/img/3.jpg",
        "https://www.greathotels.com/img/4.jpg"
      ],
      "rating": 4.82,
      "coordinates": {
        "latitude": 37.74403,
        "longitude": -122.41755
      },
      "price": 200,
      "currency": "USD"
    }
    // ... More listing results.
  ]
}
```

Offset pagination is used.

- Page numbers is useful for navigating between search results and jumping to specific pages.
- New listings are not added quickly, therefore search results do not become stale.
- Having total results is useful.

### Fetch listing details

`GET` method
`/listings/{listingId}`
Fetches the details of a listing.

#### Parameters

listingId (string)
country (string) - country for the user, for display purposes only (no currency conversion in v1, see [ADR-0001](./adr/0001-charge-in-listing-native-currency.md))

#### Sample response

```json
{
  "id": "561602", // Listing ID.
  "title": "Great view of Brannan Street, 15 mins by bus downtown. Bed and Breakfast provided!",
  "images": [
    "https://www.greathotels.com/img/1.jpg",
    "https://www.greathotels.com/img/2.jpg",
    "https://www.greathotels.com/img/3.jpg",
    "https://www.greathotels.com/img/4.jpg"
  ],
  "rating": 4.82,
  "coordinates": {
    "latitude": 37.74403,
    "longitude": -122.41755
  },
  "price": 200,
  "currency": "USD",
  "amenities": {
    "breakfast_provided": true,
    "internet": true,
    "washer": true,
    "dryer": false
    // Any additional amenities details.
  },
  "house_rules": "...",
  "contact_email": "..."
  // Any additional details.
}
```

### Create booking

Booking a listing is a two-phase flow, not a single call — see [ADR-0013](./adr/0013-two-phase-pending-confirmed-booking-flow.md) for why. `POST /bookings` reserves the dates and starts a Stripe payment; the browser then confirms that payment itself, client-side, via Stripe Elements' `CardElement` ([ADR-0011](./adr/0011-card-only-payment-via-stripe-cardelement.md)); Stripe's own webhook is what ultimately confirms the Booking.

#### Reserve dates and start payment

`POST`
`/bookings`
Requires a signed-in session. Creates the Booking as `pending` — which reserves the dates — and a Stripe PaymentIntent for its `totalPrice`. No payment details are ever sent in this request; the card is collected entirely client-side by Stripe Elements against the returned `clientSecret`.

##### Parameters

listingId (string)
checkIn (string)
checkOut (string)
guests (number)
guestName (string)
guestEmail (string)

##### Sample response

```json
{
  "booking": {
    "id": "456", // Booking ID.
    "listingId": "561602",
    "userId": "user_123",
    "checkIn": "2026-08-05",
    "checkOut": "2026-08-10",
    "guests": 2,
    "guestName": "Jane Doe",
    "guestEmail": "jane@example.com",
    "nights": 5,
    "totalPrice": 410,
    "currency": "EUR",
    "status": "pending"
  },
  // Passed to Stripe Elements in the browser to confirm the PaymentIntent —
  // never used server-side beyond this.
  "clientSecret": "pi_xxx_secret_yyy"
}
```

If the requested dates overlap an existing `pending` or `confirmed` Booking for the same listing, this returns `409`. The one exception: a colliding `pending` Booking older than 15 minutes is treated as an abandoned checkout and is reclaimed automatically (deleted, then the insert retried) rather than blocking the new request — no scheduled cleanup job is needed for this.

#### Fetch a booking

`GET`
`/bookings/{bookingId}`
Returns the Booking above by id, `status` included — this is how a client observes the `pending` → `confirmed` transition once the browser has redirected back from confirming payment (see the confirmation page's polling, [ADR-0012](./adr/0012-poll-a-server-action-for-pending-booking-confirmation.md)).

#### Confirm payment (Stripe → server)

`POST`
`/webhooks/stripe`
Not called by any client — Stripe calls this directly once payment succeeds. The signature is verified against Stripe's own signing secret before anything else happens. On a verified `payment_intent.succeeded` event, the matching Booking (found via the PaymentIntent's metadata) is flipped from `pending` to `confirmed` and the booking confirmation email is sent; a redelivery of an already-processed event is a no-op. If the Booking no longer exists (its hold was already reclaimed before payment completed), the charge is refunded automatically instead.

## Search engine optimisation (SEO)

Travel sites rely heavily on organic traffic, so search results pages and listing pages need to crawlable and shareable.

### Bookmarkable search results

- Search query and filters need to be synced with url which allow bookmarking and deep linking.
- Treat the url as the source of truth for search filters.

### Pre-generate pages for popular searches

- Popular searches such as "vacation in London" should be pre-generated.
- These pre-generated pages should use readable urls (e.g. `https://www.travelbooking.com/london/stays`)

## Internationalisation (i18n)

- Supported languages will be French.
- Static UI copy (nav, labels, buttons, legal pages) is manually translated and stored per-locale (e.g. via `next-intl`).
- Listing content (titles, descriptions, house rules) is host-written and cannot be pre-translated, so it is machine-translated automatically at display time.
- Set `lang` attribute on the `html` tag (e.g. `<html lang="fr"`). Important for SEO.
- Do not put text in images.

## Performance

Performance effects conversions, therefore this is very important.

### Image optimisations

- Use responsive images. Server the most suitable image for the device.
- Use `webP` for photos and SVGs for icons.
- For image carousels use image preloading and lazy loading.

### Code splitting

- Prioritise above-the-fold content and load code for it first.
- Use code splitting to prevent large JS bundles.
- Lazy-load components that are below the fold and elements that appear after interaction (e.g. modal)

### Performance monitoring

- Use tools such as Lighthose and Web Vitals to profile websites and measure performance.

## Device support

- Use responsive images: serve the most suitable device for the device.
- Device-specific UI:
  - No display map on mobile devices.
  - Support swipping on image carousels.
  - Interactive elements should be larger on mobile.

## User Experience

- The user should be able to open a listing detail in a new tab while preserving the search context, as many users like to compare listings in parallel.

## Accessibility

- The site should be fully accessible (WCAG AA coverage).
- Images should be alt text
- Forms should have labels and error states.
- Use semantic HTML and aria tags.
