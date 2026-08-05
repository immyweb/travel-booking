'use client';

import type { Amenity } from '@travel-booking/core';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from '@/i18n/navigation';
import { searchHref } from '@/lib/utils';

type DateRangeFilterProps = {
  city: { city: string; country: string };
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  amenities?: Amenity[];
};

export function DateRangeFilter({
  city,
  checkIn,
  checkOut,
  guests,
  amenities,
}: DateRangeFilterProps) {
  const router = useRouter();
  const t = useTranslations('Common');

  function pushDates(nextCheckIn: string | undefined, nextCheckOut: string | undefined) {
    router.push(
      searchHref({ city, checkIn: nextCheckIn, checkOut: nextCheckOut, guests, amenities }),
    );
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="date-range-check-in">{t('checkIn')}</Label>
        <Input
          id="date-range-check-in"
          type="date"
          value={checkIn ?? ''}
          onChange={(event) => pushDates(event.target.value || undefined, checkOut)}
          className="w-40"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="date-range-check-out">{t('checkOut')}</Label>
        <Input
          id="date-range-check-out"
          type="date"
          value={checkOut ?? ''}
          onChange={(event) => pushDates(checkIn, event.target.value || undefined)}
          className="w-40"
        />
      </div>
    </div>
  );
}
