'use client';

import type { CityCentroid } from '@travel-booking/core';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from '@/i18n/navigation';
import { searchHref } from '@/lib/utils';

type HeroSearchFormProps = {
  cities: CityCentroid[];
};

function cityKey(city: { city: string; country: string }) {
  return `${city.city}::${city.country}`;
}

export function HeroSearchForm({ cities }: HeroSearchFormProps) {
  const t = useTranslations('HeroSearchForm');
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState(cities[0] ? cityKey(cities[0]) : '');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('');

  const selectedCity = cities.find((city) => cityKey(city) === selectedKey);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedCity) return;

    router.push(
      searchHref({
        city: { city: selectedCity.city, country: selectedCity.country },
        checkIn: checkIn || undefined,
        checkOut: checkOut || undefined,
        guests: guests || undefined,
      }),
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid w-full grid-cols-1 gap-4 rounded-2xl bg-white p-5 text-left text-foreground shadow-2xl shadow-black/20 ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_0.8fr_auto] lg:items-end lg:gap-3"
    >
      <div className="flex flex-col gap-1.5">
        <Label id="hero-city-label" htmlFor="hero-city">
          {t('whereTo')}
        </Label>
        <Select value={selectedKey} onValueChange={setSelectedKey} disabled={cities.length === 0}>
          <SelectTrigger
            id="hero-city"
            aria-labelledby="hero-city-label hero-city-value"
            className="w-full"
          >
            <SelectValue id="hero-city-value" placeholder={t('choosePlaceholder')} />
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hero-check-in">{t('checkIn')}</Label>
        <Input
          id="hero-check-in"
          type="date"
          value={checkIn}
          onChange={(event) => setCheckIn(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hero-check-out">{t('checkOut')}</Label>
        <Input
          id="hero-check-out"
          type="date"
          value={checkOut}
          onChange={(event) => setCheckOut(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hero-guests">{t('guests')}</Label>
        <Input
          id="hero-guests"
          type="number"
          min={1}
          placeholder={t('guestsPlaceholder')}
          value={guests}
          onChange={(event) => setGuests(event.target.value)}
        />
      </div>
      <Button
        type="submit"
        size="lg"
        disabled={!selectedCity}
        className="h-10 bg-terracotta text-white hover:bg-terracotta/90 focus-visible:ring-terracotta/40 lg:h-full"
      >
        {t('searchStays')}
      </Button>
    </form>
  );
}
