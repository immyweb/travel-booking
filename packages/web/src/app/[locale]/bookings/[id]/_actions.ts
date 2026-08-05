'use server';

import type { Booking } from '@travel-booking/core';
import { fetchBooking } from '@/lib/api';

// Polled from PendingBookingWatcher rather than fetched client-side directly
// against Express — Express is only ever reached server-side (ADR-0002), so
// even a lightweight status check needs this Server Action as the hop.
export async function checkBookingStatus(id: string): Promise<Booking['status'] | null> {
  const booking = await fetchBooking(id);
  return booking?.status ?? null;
}
