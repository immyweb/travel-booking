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

export { BookingSchema, CreateBookingSchema } from './bookings';
export type { Booking, CreateBooking } from './bookings';
