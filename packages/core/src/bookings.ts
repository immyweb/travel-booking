import { z } from 'zod';
import { checkInAndCheckOutSuppliedTogether, checkOutAfterCheckIn } from './shared';

// checkIn/checkOut reuse Listing Detail's own range refinements; guests/
// maxGuests-limit and price/currency-from-listing are looked up server-side
// rather than expressed here, since they depend on the Listing the request
// references. Factored out so both CreateBookingSchema (below) and its
// client-facing counterpart apply the exact same refinements.
function withBookingDateRefinements<Shape extends z.ZodRawShape>(schema: z.ZodObject<Shape>) {
  return (
    schema
      // Both refinements are reused verbatim from ListingQuerySchema for a
      // uniform error message even though checkIn/checkOut are required here
      // — a booking always needs both dates, so "supplied together" only
      // ever fires alongside the base required-field check, never instead of it.
      .refine(checkInAndCheckOutSuppliedTogether, {
        message: 'checkIn and checkOut must be supplied together',
        path: ['checkIn'],
      })
      .refine(checkOutAfterCheckIn, {
        message: 'checkOut must be after checkIn',
        path: ['checkOut'],
      })
  );
}

const createBookingShape = {
  listingId: z.uuid(),
  checkIn: z.iso.date(),
  checkOut: z.iso.date(),
  guests: z.number().int().positive(),
  guestName: z.string().min(1),
  guestEmail: z.email(),
};

// POST /bookings' request body, as validated server-side. Never client-
// supplied — the route merges the signed-in session's userId into the body
// before this schema parses it, the same "derived server-side" treatment
// ADR-0001 gives price/currency. A refined zod object has no `.omit()` (see
// ClientCreateBookingSchema below), which is why userId is added here rather
// than by extending the client-facing schema.
export const CreateBookingSchema = withBookingDateRefinements(
  z.object({ ...createBookingShape, userId: z.string() }),
);
export type CreateBooking = z.infer<typeof CreateBookingSchema>;

// What the web client actually collects and validates — CreateBookingSchema
// minus userId, which the client never has and must never supply (see above).
export const ClientCreateBookingSchema = withBookingDateRefinements(z.object(createBookingShape));
export type ClientCreateBooking = z.infer<typeof ClientCreateBookingSchema>;

// The full Booking shape returned by both POST /bookings and GET
// /bookings/:id. `nights`/`totalPrice` are computed server-side (ADR-0001:
// captured in the Listing's own currency, never client-supplied) rather than
// trusted from the request.
export const BookingSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  userId: z.string(),
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

// POST /bookings' outcome as the web client discriminates it: 'conflict' is
// the #16 EXCLUDE constraint rejecting overlapping dates (409); 'invalid'
// covers both a missing/expired session (401) and server-side validation
// (400, e.g. guests over the listing's maxGuests) — both re-render the
// booking form rather than being treated as failures.
export type CreateBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: 'conflict' }
  | { ok: false; reason: 'invalid'; message: string };
