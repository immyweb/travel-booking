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
totalPrice (number)
status (string)

### payment_details

card_last_four_digits (string)

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

`POST`
`/bookings`
Books a listing

#### Parameters

listingId (string)
dates (object - `checkIn` and `checkOut`)
paymentDetails (object - contains payment fields)

#### Sample response

```json
{
  "id": "456", // Booking ID.
  "total_price": 400,
  "currency": "USD",
  "dates": {
    "check_in": "2022-12-24",
    "check_out": "2022-12-27"
  },
  "listing": {
    "id": "561602"
  },
  "payment_details": {
    // Only show the last 4 digits.
    // We shouldn't be storing the credit card number
    // unencrypted anyway.
    "card_last_four_digits": "1234"
  }
}
```

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
