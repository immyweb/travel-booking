export const VERSION = '0.0.0';

export { AMENITIES, AmenitySchema, ErrorResponseSchema } from './shared';
export type { Amenity, ErrorResponse } from './shared';

export {
  CitiesResponseSchema,
  CityCentroidSchema,
  ListingSummarySchema,
  SearchQuerySchema,
  SearchResponseSchema,
  toSearchParams,
} from './search';
export type {
  CitiesResponse,
  CityCentroid,
  ListingSummary,
  SearchQuery,
  SearchResponse,
} from './search';

export { AvailabilitySchema, ListingDetailSchema, ListingQuerySchema } from './listings';
export type { Availability, ListingDetail, ListingQuery } from './listings';

export {
  BookingSchema,
  ClientCreateBookingSchema,
  CreateBookingResponseSchema,
  CreateBookingSchema,
} from './bookings';
export type {
  Booking,
  ClientCreateBooking,
  CreateBooking,
  CreateBookingResponse,
  CreateBookingResult,
} from './bookings';

export { BetterAuthErrorSchema, SessionUserSchema } from './auth';
export type { AuthActionResult, BetterAuthError, SessionUser } from './auth';
