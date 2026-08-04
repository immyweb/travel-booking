# Travel Booking

A travel booking site where users search listings, view details, and make bookings.

## Language

**Listing**:
A bookable property posted on the platform — the single canonical term for what a host offers and a user searches, views, and reserves. Covers price, location, photos, amenities.
_Avoid_: Accommodation, accomodation

**Booking**:
A reservation of a Listing by a User for a date range. Created `pending` — which reserves the dates but is not yet secured — and becomes `confirmed` once payment for it succeeds. A `pending` Booking whose dates were never paid for within the hold window is reclaimable by another booking attempt.
_Avoid_: Reservation

**Amenity**:
A named feature of a Listing (e.g. `breakfast_provided`, `washer`) drawn from one fixed, shared enum — the same keys are used for search filters and for what a listing detail page displays.

**Guests**:
A flat count of people a Booking is for, supplied as a search filter and at reservation time.
_Avoid_: Number of people

**User**:
A person with a registered account (email + password), authenticated via Better Auth. A User creates a Booking under their own account, but the Booking's Guest can be someone else — the User isn't necessarily the person staying.
_Avoid_: Account, Customer

**Session**:
A User's authenticated browser session, backed by a cookie both the browser and the server can read. Its presence is what gates access to booking and My Bookings; no Session means signed out.
_Avoid_: Login, Auth token

**Guest**:
The named individual (name + email) a Booking is made for, collected at booking time — may be the User who made the Booking, or someone else booked on their behalf. Distinct from Guests, which is just a headcount.
_Avoid_: Traveler

**Location**:
The geo-position of a Listing (latitude, longitude, city, country) — used for search, browse, and maps.

**Locale**:
The UI language a visitor is browsing in (e.g. `en`, `fr`) — governs which static UI copy is shown, not to be confused with Location. A Listing's city/country is data and is never translated by Locale; only static UI copy is.
_Avoid_: Language (when referring to the routing/UI concept — use Locale to match the routing segment and translation-file naming)
