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

export const SearchQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive(),
  country: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(100).default(12),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

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
