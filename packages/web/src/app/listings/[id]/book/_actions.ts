'use server';

import { ClientCreateBookingSchema, type ClientCreateBooking } from '@travel-booking/core';
import { createBooking } from '@/lib/api';

export type BookingFormState =
  | { status: 'error'; error: string }
  | { status: 'awaitingPayment'; bookingId: string; clientSecret: string }
  | null;

// The form is React Hook Form-managed and already validates against this
// same schema client-side, but a Server Action is a reachable POST endpoint
// regardless of what any particular UI enforces — see the Next.js Server
// Actions security guidance — so the input is re-validated here rather than
// trusted as already-shaped. Beyond that, this defers to the api's own
// authoritative checks (listing existence, maxGuests, the #16 EXCLUDE
// constraint, and — new in #28 — the signed-in session) via createBooking.
//
// Unlike before #33, this no longer redirect()s on success: the created
// Booking is held 'pending' until payment is confirmed, and that
// confirmation (stripe.confirmPayment against clientSecret) has to happen
// client-side with a live Stripe.js instance — a Server Action can't drive
// that. So this hands the clientSecret back to the client component, which
// mounts Stripe Elements and confirms payment itself; Stripe's own
// return_url is what eventually navigates to the Booking's page.
export async function submitBooking(
  _prevState: BookingFormState,
  input: ClientCreateBooking,
): Promise<BookingFormState> {
  const parsed = ClientCreateBookingSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: 'error',
      error: parsed.error.issues[0]?.message ?? 'Please check the booking details.',
    };
  }

  const result = await createBooking(parsed.data);
  if (!result.ok) {
    return {
      status: 'error',
      error:
        result.reason === 'conflict'
          ? 'Sorry, these dates are no longer available for this listing.'
          : result.message,
    };
  }

  return {
    status: 'awaitingPayment',
    bookingId: result.booking.id,
    clientSecret: result.clientSecret,
  };
}
