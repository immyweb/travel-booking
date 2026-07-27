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
    page: z.coerce.number().int().positive().default(1),
    size: z.coerce.number().int().positive().max(100).default(12),
  })
  .refine((query) => (query.checkIn === undefined) === (query.checkOut === undefined), {
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
