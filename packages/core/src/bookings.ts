import { z } from 'zod';
import { checkInAndCheckOutSuppliedTogether, checkOutAfterCheckIn } from './shared';

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
