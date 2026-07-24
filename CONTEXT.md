# Travel Booking

A travel booking site where users search listings, view details, and make bookings.

## Language

**Listing**:
A bookable property posted on the platform — the single canonical term for what a host offers and a user searches, views, and reserves. Covers price, location, photos, amenities.
_Avoid_: Accommodation, accomodation

**Booking**:
A confirmed reservation of a Listing by a User for a date range, created via payment.
_Avoid_: Reservation

**Amenity**:
A named feature of a Listing (e.g. `breakfast_provided`, `washer`) drawn from one fixed, shared enum — the same keys are used for search filters and for what a listing detail page displays.

**Guests**:
A flat count of people a Booking is for, supplied as a search filter and at reservation time.
_Avoid_: Number of people

**Location**:
The geo-position of a Listing (latitude, longitude, city, country) — used for search, browse, and maps.
