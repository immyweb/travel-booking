'use server';

import { ClientCreateBookingSchema, type ClientCreateBooking } from '@travel-booking/core';
import { redirect } from 'next/navigation';
import { createBooking } from '@/lib/api';

export type BookingFormState = { error: string } | null;

// The form is React Hook Form-managed and already validates against this
// same schema client-side, but a Server Action is a reachable POST endpoint
// regardless of what any particular UI enforces — see the Next.js Server
// Actions security guidance — so the input is re-validated here rather than
// trusted as already-shaped. Beyond that, this defers to the api's own
// authoritative checks (listing existence, maxGuests, the #16 EXCLUDE
// constraint, and — new in #28 — the signed-in session) via createBooking.
export async function submitBooking(
  _prevState: BookingFormState,
  input: ClientCreateBooking,
): Promise<BookingFormState> {
  const parsed = ClientCreateBookingSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the booking details.' };
  }

  const result = await createBooking(parsed.data);
  if (!result.ok) {
    return {
      error:
        result.reason === 'conflict'
          ? 'Sorry, these dates are no longer available for this listing.'
          : result.message,
    };
  }

  // Called outside any try/catch: redirect() works by throwing a control-flow
  // exception, so wrapping it would swallow the navigation instead of letting
  // it happen.
  redirect(`/bookings/${result.booking.id}`);
}
