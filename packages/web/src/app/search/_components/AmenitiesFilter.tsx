'use client';

import { AMENITIES, type Amenity } from '@travel-booking/core';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';

type AmenitiesFilterProps = {
  city: { city: string; country: string };
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  amenities: Amenity[];
};

function amenityLabel(amenity: Amenity): string {
  return amenity
    .split('_')
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(' ');
}

export function AmenitiesFilter({
  city,
  checkIn,
  checkOut,
  guests,
  amenities,
}: AmenitiesFilterProps) {
  const router = useRouter();

  function toggle(amenity: Amenity, checked: boolean) {
    const nextAmenities = checked
      ? [...amenities, amenity]
      : amenities.filter((selected) => selected !== amenity);

    const params = new URLSearchParams({ city: city.city, country: city.country });
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests) params.set('guests', guests);
    for (const nextAmenity of nextAmenities) params.append('amenities', nextAmenity);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3">
      {AMENITIES.map((amenity) => (
        <label key={amenity} className="flex items-center gap-1.5 text-sm">
          <Checkbox
            checked={amenities.includes(amenity)}
            onCheckedChange={(checked) => toggle(amenity, checked === true)}
          />
          {amenityLabel(amenity)}
        </label>
      ))}
    </div>
  );
}
