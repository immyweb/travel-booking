import type { Amenity } from '@travel-booking/core';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Shared by the Search amenities filter and the Listing Detail amenity list,
// so both render the exact same labels from one implementation.
export function amenityLabel(amenity: Amenity): string {
  return amenity
    .split('_')
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(' ');
}

// Shared by Search's listing links and the Listing Detail page's "Book now"
// link, so a guest's selected dates/guest count keep following them through
// both hops without each call site re-deriving the same query string.
export function carryDatesAndGuests(selection: {
  checkIn?: string;
  checkOut?: string;
  guests?: string | number;
}): string {
  const params = new URLSearchParams({
    ...(selection.checkIn && selection.checkOut
      ? { checkIn: selection.checkIn, checkOut: selection.checkOut }
      : {}),
    ...(selection.guests ? { guests: String(selection.guests) } : {}),
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}
