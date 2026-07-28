'use server';

import { CreateBookingSchema } from '@travel-booking/core';
import { redirect } from 'next/navigation';
import { createBooking } from '@/lib/api';
import { bookingFieldsFromFormData } from './_bookingFields';

export type BookingFormState = { error: string } | null;

// Re-validates with the same schema the client already checked against —
// FormData is untrusted input regardless of what the UI enforced (see the
// Next.js Server Actions security guidance) — then defers to the api's own
// authoritative checks (listing existence, maxGuests, the #16 EXCLUDE
// constraint) via createBooking.
export async function submitBooking(
  _prevState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const parsed = CreateBookingSchema.safeParse(bookingFieldsFromFormData(formData));

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
