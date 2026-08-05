'use client';

import { AMENITIES, type Amenity } from '@travel-booking/core';
import { ChevronDownIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from '@/i18n/navigation';
import { searchHref } from '@/lib/utils';

type AmenitiesFilterProps = {
  city: { city: string; country: string };
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  amenities: Amenity[];
};

export function AmenitiesFilter({
  city,
  checkIn,
  checkOut,
  guests,
  amenities,
}: AmenitiesFilterProps) {
  const router = useRouter();
  const t = useTranslations('AmenitiesFilter');
  const tAmenities = useTranslations('Amenities');

  function toggle(amenity: Amenity, checked: boolean) {
    const nextAmenities = checked
      ? [...amenities, amenity]
      : amenities.filter((selected) => selected !== amenity);

    router.push(searchHref({ city, checkIn, checkOut, guests, amenities: nextAmenities }));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          {amenities.length > 0 ? t('amenitiesCount', { count: amenities.length }) : t('amenities')}
          <ChevronDownIcon
            data-icon="inline-end"
            className="pointer-events-none size-4 text-muted-foreground"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {AMENITIES.map((amenity) => (
          <DropdownMenuCheckboxItem
            key={amenity}
            checked={amenities.includes(amenity)}
            // Toggling one amenity shouldn't close the menu — a guest picking
            // several amenities would otherwise have to reopen it each time.
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) => toggle(amenity, checked)}
          >
            {tAmenities(amenity)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
