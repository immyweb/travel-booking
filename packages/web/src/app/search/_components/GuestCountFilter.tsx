'use client';

import type { Amenity } from '@travel-booking/core';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';

type GuestCountFilterProps = {
  city: { city: string; country: string };
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  amenities?: Amenity[];
};

export function GuestCountFilter({
  city,
  checkIn,
  checkOut,
  guests,
  amenities,
}: GuestCountFilterProps) {
  const router = useRouter();

  function pushGuests(nextGuests: string | undefined) {
    const params = new URLSearchParams({ city: city.city, country: city.country });
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (nextGuests) params.set('guests', nextGuests);
    for (const amenity of amenities ?? []) params.append('amenities', amenity);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <Input
      type="number"
      min={1}
      aria-label="Guests"
      value={guests ?? ''}
      onChange={(event) => pushGuests(event.target.value || undefined)}
      className="w-20"
    />
  );
}
