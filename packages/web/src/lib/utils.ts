import type { Amenity } from '@travel-booking/core';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Guards the `redirect` query param sign-in/sign-up accept: only an in-app
// path is followed after auth succeeds, never an absolute URL or a
// protocol-relative "//host" — both would let an attacker redirect a
// freshly authenticated session off-site.
export function toInternalPath(path: string | undefined): string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) {
    return '/';
  }
  return path;
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

// Shared by /[city]/stays' generateStaticParams and its request-time slug
// matching (ADR-0007), so a given city always resolves to the same slug and
// the two can never drift apart.
// U+0300-U+036F, the accents/diacritics NFKD decomposition splits off
// (e.g. "ã" -> "a" + U+0303) — stripped so "São Paulo" slugifies to
// "sao-paulo" rather than keeping the accent as a stray character.
const COMBINING_DIACRITICAL_MARKS = /[̀-ͯ]/g;

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(COMBINING_DIACRITICAL_MARKS, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Shared by Search's city, date, guest count, and amenities filters — each
// navigates to /search with the full filter selection, only one field of
// which it's actually changing itself.
export function searchHref(selection: {
  city: { city: string; country: string };
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  amenities?: Amenity[];
}): string {
  const params = new URLSearchParams({
    city: selection.city.city,
    country: selection.city.country,
  });
  if (selection.checkIn) params.set('checkIn', selection.checkIn);
  if (selection.checkOut) params.set('checkOut', selection.checkOut);
  if (selection.guests) params.set('guests', selection.guests);
  for (const amenity of selection.amenities ?? []) params.append('amenities', amenity);
  return `/search?${params.toString()}`;
}
