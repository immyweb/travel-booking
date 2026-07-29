'use client';

import type { Amenity } from '@travel-booking/core';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { searchHref } from '@/lib/utils';

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
    router.push(searchHref({ city, checkIn, checkOut, guests: nextGuests, amenities }));
  }

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="guest-count">Guests</Label>
      <Input
        id="guest-count"
        type="number"
        min={1}
        value={guests ?? '0'}
        onChange={(event) => pushGuests(event.target.value || undefined)}
        className="w-20"
      />
    </div>
  );
}
