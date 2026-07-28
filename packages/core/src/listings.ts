import { z } from 'zod';
import {
  AmenitySchema,
  checkInAndCheckOutSuppliedTogether,
  checkOutAfterCheckIn,
  CoordinatesSchema,
} from './shared';

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
