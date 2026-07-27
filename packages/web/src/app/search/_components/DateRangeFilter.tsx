'use client';

import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';

type DateRangeFilterProps = {
  city: { city: string; country: string };
  checkIn?: string;
  checkOut?: string;
  guests?: string;
};

export function DateRangeFilter({ city, checkIn, checkOut, guests }: DateRangeFilterProps) {
  const router = useRouter();

  function pushDates(nextCheckIn: string | undefined, nextCheckOut: string | undefined) {
    const params = new URLSearchParams({ city: city.city, country: city.country });
    if (nextCheckIn) params.set('checkIn', nextCheckIn);
    if (nextCheckOut) params.set('checkOut', nextCheckOut);
    if (guests) params.set('guests', guests);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        aria-label="Check-in"
        value={checkIn ?? ''}
        onChange={(event) => pushDates(event.target.value || undefined, checkOut)}
        className="w-40"
      />
      <Input
        type="date"
        aria-label="Check-out"
        value={checkOut ?? ''}
        onChange={(event) => pushDates(checkIn, event.target.value || undefined)}
        className="w-40"
      />
    </div>
  );
}
