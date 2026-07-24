'use client';

import type { CityCentroid } from '@travel-booking/core';
import { useRouter } from 'next/navigation';
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
};

function cityKey(city: { city: string; country: string }) {
  return `${city.city}::${city.country}`;
}

export function CityPicker({ cities, selectedCity }: CityPickerProps) {
  const router = useRouter();

  return (
    <Select
      value={cityKey(selectedCity)}
      onValueChange={(value) => {
        const selected = cities.find((city) => cityKey(city) === value);
        if (!selected) return;
        const params = new URLSearchParams({ city: selected.city, country: selected.country });
        router.push(`/search?${params.toString()}`);
      }}
    >
      <SelectTrigger aria-label="Where to?" className="w-56">
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
  );
}
