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
