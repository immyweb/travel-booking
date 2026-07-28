'use client';

import { CreateBookingSchema } from '@travel-booking/core';
import { useActionState, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { bookingFieldsFromFormData } from '../_bookingFields';
import { submitBooking, type BookingFormState } from '../_actions';

type BookingFormProps = {
  listingId: string;
  maxGuests: number;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
};

const initialState: BookingFormState = null;

export function BookingForm({ listingId, maxGuests, checkIn, checkOut, guests }: BookingFormProps) {
  const [state, formAction, pending] = useActionState(submitBooking, initialState);
  const [clientError, setClientError] = useState<string | null>(null);
  const hasDateRange = Boolean(checkIn && checkOut);

  // Mirrors the same checks the api enforces, so an invalid submission never
  // makes the round trip at all — the Server Action re-runs CreateBookingSchema
  // itself regardless, since a client can always bypass this handler.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const fields = bookingFieldsFromFormData(new FormData(event.currentTarget));
    const parsed = CreateBookingSchema.safeParse(fields);

    if (!parsed.success) {
      event.preventDefault();
      setClientError(parsed.error.issues[0]?.message ?? 'Please check the booking details.');
      return;
    }

    // Not expressed in CreateBookingSchema — it's a per-listing limit, not a
    // shape rule (see the schema's own comment) — so it's checked separately.
    if (fields.guests > maxGuests) {
      event.preventDefault();
      setClientError(`This listing sleeps up to ${maxGuests} guests.`);
      return;
    }

    setClientError(null);
  }

  const error = clientError ?? state?.error;

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="listingId" value={listingId} />

      {hasDateRange ? (
        <input type="hidden" name="checkIn" value={checkIn} />
      ) : (
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="book-check-in">Check-in</Label>
            <Input id="book-check-in" type="date" name="checkIn" required className="w-40" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="book-check-out">Check-out</Label>
            <Input id="book-check-out" type="date" name="checkOut" required className="w-40" />
          </div>
        </div>
      )}
      {hasDateRange && <input type="hidden" name="checkOut" value={checkOut} />}

      {guests ? (
        <div className="flex flex-col gap-1">
          <Label>Guests</Label>
          <p className="text-sm">
            {guests} guest{guests === 1 ? '' : 's'}
          </p>
          <input type="hidden" name="guests" value={guests} />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <Label htmlFor="book-guests">Guests</Label>
          <Input
            id="book-guests"
            type="number"
            name="guests"
            min={1}
            max={maxGuests}
            defaultValue={1}
            required
            className="w-20"
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Label htmlFor="book-guest-name">Full name</Label>
        <Input id="book-guest-name" type="text" name="guestName" required />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="book-guest-email">Email</Label>
        <Input id="book-guest-email" type="email" name="guestEmail" required />
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        Confirm booking
      </Button>
    </form>
  );
}
