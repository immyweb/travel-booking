import { z } from 'zod';

export const VERSION = '0.0.0';

// Fixed, shared amenity enum — same keys used for search filters and listing
// detail display (see CONTEXT.md's Amenity definition).
export const AMENITIES = [
  'wifi',
  'breakfast_provided',
  'washer',
  'kitchen',
  'pool',
  'parking',
] as const;

export const AmenitySchema = z.enum(AMENITIES);
export type Amenity = z.infer<typeof AmenitySchema>;

const CoordinatesSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export const SearchQuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radiusKm: z.coerce.number().positive(),
    country: z.string().min(1).optional(),
    checkIn: z.iso.date().optional(),
    checkOut: z.iso.date().optional(),
    guests: z.coerce.number().int().positive().optional(),
    // A single selected amenity arrives as a bare string on the query string
    // (`amenities=wifi`); only two or more become an array
    // (`amenities=wifi&amenities=parking`) — normalized to an array either way
    // so the service always deals with one shape.
    amenities: z
      .union([AmenitySchema, z.array(AmenitySchema)])
      .transform((value) => (Array.isArray(value) ? value : [value]))
      .optional(),
    page: z.coerce.number().int().positive().default(1),
    size: z.coerce.number().int().positive().max(100).default(12),
  })
  .refine(checkInAndCheckOutSuppliedTogether, {
    message: 'checkIn and checkOut must be supplied together',
    path: ['checkIn'],
  });
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

// Lives next to the schema that defines the fields, and derives the query
// string from whatever SearchQuery holds — so adding a filter to
// SearchQuerySchema needs no change here and no change in the web fetch
// module. Scalars and arrays of scalars only: an object-valued filter (nested
// amenities, say) needs a deliberate decision about its wire encoding.
export function toSearchParams(query: SearchQuery): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }

    for (const item of Array.isArray(value) ? value : [value]) {
      params.append(key, String(item));
    }
  }

  return params;
}

export const ListingSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  images: z.array(z.string()),
  price: z.number(),
  currency: z.string(),
  coordinates: CoordinatesSchema,
  distanceKm: z.number(),
});
export type ListingSummary = z.infer<typeof ListingSummarySchema>;

export const SearchResponseSchema = z.object({
  pagination: z.object({
    page: z.number(),
    size: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  results: z.array(ListingSummarySchema),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

// Present only when the caller supplied both checkIn and checkOut to
// GET /listings/:id — the same check-in-inclusive/check-out-exclusive
// overlap rule Search applies against the `bookings` table decides `available`.
export const AvailabilitySchema = z.object({
  checkIn: z.iso.date(),
  checkOut: z.iso.date(),
  available: z.boolean(),
  nights: z.number(),
  totalPrice: z.number(),
});
export type Availability = z.infer<typeof AvailabilitySchema>;

type DateRange = { checkIn?: string; checkOut?: string };

// Shared by every schema that carries a checkIn/checkOut pair (Listing Detail's
// query params, a booking request's body) so the "partial or reversed range"
// rejection reads identically everywhere it's enforced.
function checkInAndCheckOutSuppliedTogether(range: DateRange): boolean {
  return (range.checkIn === undefined) === (range.checkOut === undefined);
}

// ISO date strings compare lexicographically the same as chronologically —
// without this, a reversed range would silently produce a negative
// nights/totalPrice rather than being rejected as the client mistake it is.
function checkOutAfterCheckIn(range: DateRange): boolean {
  return !range.checkIn || !range.checkOut || range.checkOut > range.checkIn;
}

// GET /listings/:id's optional query params: checkIn/checkOut must be
// supplied together, mirroring SearchQuerySchema's own refine — a lone
// in-progress date is a client mistake (400), not a partial filter.
export const ListingQuerySchema = z
  .object({
    checkIn: z.iso.date().optional(),
    checkOut: z.iso.date().optional(),
  })
  .refine(checkInAndCheckOutSuppliedTogether, {
    message: 'checkIn and checkOut must be supplied together',
    path: ['checkIn'],
  })
  .refine(checkOutAfterCheckIn, {
    message: 'checkOut must be after checkIn',
    path: ['checkOut'],
  });
export type ListingQuery = z.infer<typeof ListingQuerySchema>;

// The full single-listing read (`GET /listings/:id`) — distinct from
// ListingSummarySchema's search-result row, which carries `distanceKm`
// instead of the fields only a detail view needs. `availability` is `null`
// unless the caller supplied checkIn/checkOut.
export const ListingDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  images: z.array(z.string()),
  price: z.number(),
  currency: z.string(),
  maxGuests: z.number(),
  amenities: z.array(AmenitySchema),
  city: z.string(),
  country: z.string(),
  coordinates: CoordinatesSchema,
  availability: AvailabilitySchema.nullable(),
});
export type ListingDetail = z.infer<typeof ListingDetailSchema>;

// POST /bookings' request body. checkIn/checkOut reuse Listing Detail's own
// range refinements; guests/maxGuests-limit and price/currency-from-listing
// are looked up server-side rather than expressed here, since they depend on
// the Listing the request references.
export const CreateBookingSchema = z
  .object({
    listingId: z.uuid(),
    checkIn: z.iso.date(),
    checkOut: z.iso.date(),
    guests: z.number().int().positive(),
    guestName: z.string().min(1),
    guestEmail: z.email(),
  })
  // Both refinements are reused verbatim from ListingQuerySchema for a
  // uniform error message even though checkIn/checkOut are required here —
  // a booking always needs both dates, so "supplied together" only ever
  // fires alongside the base required-field check, never instead of it.
  .refine(checkInAndCheckOutSuppliedTogether, {
    message: 'checkIn and checkOut must be supplied together',
    path: ['checkIn'],
  })
  .refine(checkOutAfterCheckIn, {
    message: 'checkOut must be after checkIn',
    path: ['checkOut'],
  });
export type CreateBooking = z.infer<typeof CreateBookingSchema>;

// The full Booking shape returned by both POST /bookings and GET
// /bookings/:id. `nights`/`totalPrice` are computed server-side (ADR-0001:
// captured in the Listing's own currency, never client-supplied) rather than
// trusted from the request.
export const BookingSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  checkIn: z.iso.date(),
  checkOut: z.iso.date(),
  guests: z.number(),
  guestName: z.string(),
  guestEmail: z.string(),
  nights: z.number(),
  totalPrice: z.number(),
  currency: z.string(),
});
export type Booking = z.infer<typeof BookingSchema>;

export const CityCentroidSchema = z.object({
  city: z.string(),
  country: z.string(),
  coordinates: CoordinatesSchema,
});
export type CityCentroid = z.infer<typeof CityCentroidSchema>;

export const CitiesResponseSchema = z.object({
  cities: z.array(CityCentroidSchema),
});
export type CitiesResponse = z.infer<typeof CitiesResponseSchema>;

// The envelope every non-2xx response from the api uses. Shared so the web
// package can read the message the api produced rather than inferring one from
// the status code.
export const ErrorResponseSchema = z.object({
  error: z.object({
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
