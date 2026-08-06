import type { Amenity } from '@travel-booking/core';
import type { Metadata } from 'next';
import {
  CalendarDays,
  ChefHat,
  Coffee,
  type LucideIcon,
  SquareParking,
  Users,
  Waves,
  WashingMachine,
  Wifi,
} from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { displayFont } from '@/app/_components/fonts';
import { TileMark } from '@/app/_components/TileMark';
import { Button, buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { languageAlternates } from '@/i18n/metadata';
import { fetchListing } from '@/lib/api';
import { carryDatesAndGuests, cn } from '@/lib/utils';
import { ListingGallery } from './_components/ListingGallery';

// Fixed alongside AMENITIES in @travel-booking/core — each entry there needs
// a matching icon here for the amenity grid below.
const AMENITY_ICONS: Record<Amenity, LucideIcon> = {
  wifi: Wifi,
  breakfast_provided: Coffee,
  washer: WashingMachine,
  kitchen: ChefHat,
  pool: Waves,
  parking: SquareParking,
};

type ListingDetailPageProps = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string; guests?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: ListingDetailPageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const { checkIn, checkOut } = await searchParams;

  // Same URL as the page component's own fetchListing call below (when dates
  // are present) — Next.js memoizes identical GET fetches within a render
  // pass, so this avoids a second round trip to the API for the same listing.
  const listing = await fetchListing(id, checkIn && checkOut ? { checkIn, checkOut } : undefined);
  if (!listing) {
    notFound();
  }

  const [t, format] = await Promise.all([
    getTranslations({ locale, namespace: 'ListingDetailPage' }),
    getFormatter({ locale }),
  ]);

  return {
    title: listing.title,
    description: t('metaDescription', {
      title: listing.title,
      city: listing.city,
      country: listing.country,
      price: format.number(listing.price, { style: 'currency', currency: listing.currency }),
    }),
    alternates: { languages: languageAlternates(`/listings/${id}`) },
  };
}

export default async function ListingDetailPage({ params, searchParams }: ListingDetailPageProps) {
  const { id } = await params;
  const { checkIn, checkOut, guests } = await searchParams;

  // Dates are only meaningful (and only valid per the API's Zod schema) when
  // supplied together, mirroring how Search treats a lone in-progress
  // selection as no filter at all.
  const hasDateRange = Boolean(checkIn && checkOut);
  const listing = await fetchListing(
    id,
    hasDateRange ? { checkIn: checkIn!, checkOut: checkOut! } : undefined,
  );

  if (!listing) {
    notFound();
  }

  const [t, tCommon, tAmenities, format] = await Promise.all([
    getTranslations('ListingDetailPage'),
    getTranslations('Common'),
    getTranslations('Amenities'),
    getFormatter(),
  ]);

  const { availability } = listing;
  // No dates chosen (a bookmarked/shared link) is treated the same as
  // available: nothing here blocks the guest from starting a booking.
  const canBook = availability === null || availability.available;

  // The booking flow itself is separate, not-yet-built work — this carries
  // the guest's dates/guest count forward the same way Search's own links do,
  // so whatever's built next doesn't have to re-collect them.
  const bookHref = `/listings/${listing.id}/book${carryDatesAndGuests({ checkIn, checkOut, guests })}`;

  return (
    <main className="flex flex-1 flex-col bg-limestone">
      <div className="motion-safe:animate-[rise-in_0.5s_ease-out] mx-auto w-full max-w-6xl px-6 py-8 sm:py-10">
        <p className="font-mono text-xs tracking-wide text-azulejo/70 uppercase">
          {listing.city}, {listing.country}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px] lg:items-start">
          <div className="flex flex-col gap-8">
            <ListingGallery images={listing.images} title={listing.title} />

            <div className="flex flex-col gap-2">
              <h1
                className={`${displayFont.className} text-3xl font-semibold text-azulejo sm:text-4xl`}
              >
                {listing.title}
              </h1>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="size-4 shrink-0" aria-hidden="true" />
                <span>{t('sleepsUpTo', { count: listing.maxGuests })}</span>
              </p>
            </div>

            <div className="h-px w-full bg-azulejo/10" />

            <div className="flex flex-col gap-4">
              <h2 className={`${displayFont.className} text-xl font-semibold text-azulejo`}>
                {t('amenitiesHeading')}
              </h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {listing.amenities.map((amenity) => {
                  const Icon = AMENITY_ICONS[amenity];
                  return (
                    <li
                      key={amenity}
                      className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2.5 text-sm text-foreground ring-1 ring-azulejo/10"
                    >
                      <Icon className="size-4 shrink-0 text-terracotta" aria-hidden="true" />
                      <span>{tAmenities(amenity)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg shadow-azulejo/5 ring-1 ring-azulejo/10">
              <TileMark
                aria-hidden="true"
                className="pointer-events-none absolute -top-4 -right-4 size-24 text-azulejo/[0.05]"
              />
              <div className="relative flex flex-col gap-4">
                <p className="font-mono text-2xl font-semibold text-azulejo">
                  {format.number(listing.price, { style: 'currency', currency: listing.currency })}{' '}
                  <span className="text-sm font-normal text-muted-foreground">{t('perNight')}</span>
                </p>

                {availability && (
                  <div className="flex flex-col gap-1 rounded-lg bg-limestone p-4 ring-1 ring-azulejo/10">
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                      <span>
                        {format.dateTime(new Date(availability.checkIn), { dateStyle: 'medium' })} –{' '}
                        {format.dateTime(new Date(availability.checkOut), { dateStyle: 'medium' })}{' '}
                        · {tCommon('nights', { count: availability.nights })}
                      </span>
                    </p>
                    {availability.available ? (
                      <p className="text-lg font-semibold text-azulejo">
                        {tCommon('total', {
                          total: format.number(availability.totalPrice, {
                            style: 'currency',
                            currency: listing.currency,
                          }),
                        })}
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-destructive">{t('notAvailable')}</p>
                    )}
                  </div>
                )}

                {canBook ? (
                  <Link
                    href={bookHref}
                    className={cn(
                      buttonVariants({
                        size: 'lg',
                        className:
                          'h-11 w-full bg-terracotta text-white hover:bg-terracotta/90 focus-visible:ring-terracotta/40',
                      }),
                    )}
                  >
                    {t('bookNow')}
                  </Link>
                ) : (
                  <Button disabled size="lg" className="h-11 w-full">
                    {t('bookNow')}
                  </Button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
