import { and, gt, lt } from 'drizzle-orm';
import { bookings } from './schema';

// Check-in inclusive, check-out exclusive: a booking blocks a requested
// range only if it truly overlaps, so a checkout on day X doesn't block a
// new check-in on day X. Shared by Search (excluding unavailable listings
// from results) and Listing Detail (deciding one listing's availability),
// which both need this identical rule.
export function bookingOverlapsRange(checkIn: string, checkOut: string) {
  return and(lt(bookings.checkIn, checkOut), gt(bookings.checkOut, checkIn));
}
