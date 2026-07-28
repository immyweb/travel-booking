import { z } from 'zod';

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

export const CoordinatesSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

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

type DateRange = { checkIn?: string; checkOut?: string };

// Shared by every schema that carries a checkIn/checkOut pair (Listing Detail's
// query params, a booking request's body) so the "partial or reversed range"
// rejection reads identically everywhere it's enforced.
export function checkInAndCheckOutSuppliedTogether(range: DateRange): boolean {
  return (range.checkIn === undefined) === (range.checkOut === undefined);
}

// ISO date strings compare lexicographically the same as chronologically —
// without this, a reversed range would silently produce a negative
// nights/totalPrice rather than being rejected as the client mistake it is.
export function checkOutAfterCheckIn(range: DateRange): boolean {
  return !range.checkIn || !range.checkOut || range.checkOut > range.checkIn;
}
