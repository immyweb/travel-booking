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
import { searchHref } from '@/lib/utils';

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
      <Label id="city-picker-label" htmlFor="city-picker">
        Where to?
      </Label>
      <Select
        value={cityKey(selectedCity)}
        onValueChange={(value) => {
          const selected = cities.find((city) => cityKey(city) === value);
          if (!selected) return;
          router.push(
            searchHref({
              city: { city: selected.city, country: selected.country },
              checkIn,
              checkOut,
              guests,
              amenities,
            }),
          );
        }}
      >
        <SelectTrigger
          id="city-picker"
          aria-labelledby="city-picker-label city-picker-value"
          className="w-56"
        >
          <SelectValue id="city-picker-value" placeholder="Where to?" />
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
