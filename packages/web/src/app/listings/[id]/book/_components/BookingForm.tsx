'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CreateBookingSchema, type CreateBooking } from '@travel-booking/core';
import { startTransition, useActionState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitBooking, type BookingFormState } from '../_actions';

type BookingFormProps = {
  listingId: string;
  maxGuests: number;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
};

const initialState: BookingFormState = null;

// Priority order for showing one error at a time — matches the fields'
// top-to-bottom order in the form below. Includes listingId (hidden, not
// user-editable) so a bad route param still surfaces instead of silently
// blocking submission with no visible error.
const FIELD_ORDER = [
  'listingId',
  'checkIn',
  'checkOut',
  'guests',
  'guestName',
  'guestEmail',
] as const;

export function BookingForm({ listingId, maxGuests, checkIn, checkOut, guests }: BookingFormProps) {
  const [state, formAction, pending] = useActionState(submitBooking, initialState);
  const hasDateRange = Boolean(checkIn && checkOut);

  // maxGuests is a per-listing limit, not a shape rule, so it isn't expressed
  // in CreateBookingSchema itself (see the schema's own comment) — it's
  // layered on here, scoped to this listing.
  const schema = useMemo(
    () =>
      CreateBookingSchema.refine((data) => data.guests <= maxGuests, {
        message: `This listing sleeps up to ${maxGuests} guests.`,
        path: ['guests'],
      }),
    [maxGuests],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateBooking>({
    resolver: zodResolver(schema),
    defaultValues: { listingId, checkIn, checkOut, guests: guests ?? 1 },
  });

  // useActionState's dispatcher isn't only for <form action>: it can be
  // invoked directly with whatever argument the action expects, which is how
  // a React Hook Form-validated submit hands off to the Server Action here.
  // Bypassing the action/formAction prop also means React no longer wraps
  // the dispatch in a transition automatically, so startTransition is
  // required here to keep `pending` updating correctly.
  function onValid(values: CreateBooking) {
    startTransition(() => {
      formAction(values);
    });
  }

  const fieldError = FIELD_ORDER.map((field) => errors[field]?.message).find(Boolean);
  const error = fieldError ?? state?.error;

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="flex flex-col gap-4">
      <input type="hidden" {...register('listingId')} />

      {hasDateRange ? (
        <>
          <input type="hidden" {...register('checkIn')} />
          <input type="hidden" {...register('checkOut')} />
        </>
      ) : (
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="book-check-in">Check-in</Label>
            <Input id="book-check-in" type="date" className="w-40" {...register('checkIn')} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="book-check-out">Check-out</Label>
            <Input id="book-check-out" type="date" className="w-40" {...register('checkOut')} />
          </div>
        </div>
      )}

      {guests ? (
        <div className="flex flex-col gap-1">
          <Label>Guests</Label>
          <p className="text-sm">
            {guests} guest{guests === 1 ? '' : 's'}
          </p>
          <input type="hidden" {...register('guests', { valueAsNumber: true })} />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <Label htmlFor="book-guests">Guests</Label>
          <Input
            id="book-guests"
            type="number"
            min={1}
            max={maxGuests}
            className="w-20"
            {...register('guests', { valueAsNumber: true })}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Label htmlFor="book-guest-name">Full name</Label>
        <Input id="book-guest-name" type="text" {...register('guestName')} />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="book-guest-email">Email</Label>
        <Input id="book-guest-email" type="email" {...register('guestEmail')} />
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
