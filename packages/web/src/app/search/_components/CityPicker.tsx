'use client';

import type { Amenity, CityCentroid } from '@travel-booking/core';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CityPickerProps = {
  cities: CityCentroid[];
  selectedCity: { city: string; country: string };
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  amenities?: Amenity[];
};

function cityKey(city: { city: string; country: string }) {
  return `${city.city}::${city.country}`;
}

export function CityPicker({
  cities,
  selectedCity,
  checkIn,
  checkOut,
  guests,
  amenities,
}: CityPickerProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="city-picker">Where to?</Label>
      <Select
        value={cityKey(selectedCity)}
        onValueChange={(value) => {
          const selected = cities.find((city) => cityKey(city) === value);
          if (!selected) return;
          const params = new URLSearchParams({ city: selected.city, country: selected.country });
          if (checkIn && checkOut) {
            params.set('checkIn', checkIn);
            params.set('checkOut', checkOut);
          }
          if (guests) params.set('guests', guests);
          for (const amenity of amenities ?? []) params.append('amenities', amenity);
          router.push(`/search?${params.toString()}`);
        }}
      >
        <SelectTrigger id="city-picker" className="w-56">
          <SelectValue placeholder="Where to?" />
        </SelectTrigger>
        <SelectContent>
          {cities.map((city) => (
            <SelectItem key={cityKey(city)} value={cityKey(city)}>
              {city.city}, {city.country}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
