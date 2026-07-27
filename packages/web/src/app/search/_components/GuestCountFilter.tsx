'use client';

import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';

type GuestCountFilterProps = {
  city: { city: string; country: string };
  checkIn?: string;
  checkOut?: string;
  guests?: string;
};

export function GuestCountFilter({ city, checkIn, checkOut, guests }: GuestCountFilterProps) {
  const router = useRouter();

  function pushGuests(nextGuests: string | undefined) {
    const params = new URLSearchParams({ city: city.city, country: city.country });
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (nextGuests) params.set('guests', nextGuests);
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
