import { z } from 'zod';
import { AmenitySchema, checkInAndCheckOutSuppliedTogether, CoordinatesSchema } from './shared';

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
