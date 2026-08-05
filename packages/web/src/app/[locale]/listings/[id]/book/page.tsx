import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { displayFont } from '@/app/_components/fonts';
import { ListingSummaryCard } from '@/app/_components/ListingSummaryCard';
import { redirect } from '@/i18n/navigation';
import { languageAlternates } from '@/i18n/metadata';
import { fetchListing, fetchSession } from '@/lib/api';
import { carryDatesAndGuests } from '@/lib/utils';
import { BookingForm } from './_components/BookingForm';

type BookListingPageProps = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string; guests?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: BookListingPageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const { checkIn, checkOut } = await searchParams;

  // Same URL as the page component's own fetchListing call below (when dates
  // are present) — Next.js memoizes identical GET fetches within a render
  // pass, so this avoids a second round trip to the API for the same listing.
  const listing = await fetchListing(id, checkIn && checkOut ? { checkIn, checkOut } : undefined);
  if (!listing) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'BookListingPage' });

  return {
    title: t('metaTitle', { title: listing.title }),
    alternates: { languages: languageAlternates(`/listings/${id}/book`) },
  };
}

export default async function BookListingPage({ params, searchParams }: BookListingPageProps) {
  const { id, locale } = await params;
  const { checkIn, checkOut, guests } = await searchParams;

  // Checked before fetchListing, not after: a signed-out customer shouldn't
  // pay for a listing lookup on a page they're about to be redirected away
  // from. carryDatesAndGuests (shared with Search/Listing Detail's own
  // "Book now" links) preserves the in-progress selection across the detour.
  const session = await fetchSession();
  if (!session) {
    const bookingPath = `/listings/${id}/book${carryDatesAndGuests({ checkIn, checkOut, guests })}`;
    return redirect({ href: `/sign-in?redirect=${encodeURIComponent(bookingPath)}`, locale });
  }

  // Dates are only meaningful (and only valid per the API's Zod schema) when
  // supplied together, mirroring Listing Detail's own treatment of a lone
  // in-progress selection as no filter at all.
  const hasDateRange = Boolean(checkIn && checkOut);
  const listing = await fetchListing(
    id,
    hasDateRange ? { checkIn: checkIn!, checkOut: checkOut! } : undefined,
  );

  if (!listing) {
    notFound();
  }

  // Only a positive integer within this listing's own capacity counts as a
  // usable carried-forward guest count — a value from a stale link or a
  // different listing's search still needs collecting/fixing here.
  const requestedGuests = Number(guests);
  const hasGuestCount =
    Boolean(guests) &&
    Number.isInteger(requestedGuests) &&
    requestedGuests > 0 &&
    requestedGuests <= listing.maxGuests;

  const [t, tCommon, format] = await Promise.all([
    getTranslations('BookListingPage'),
    getTranslations('Common'),
    getFormatter(),
  ]);

  return (
    <main className="flex flex-1 flex-col bg-limestone">
      <div className="motion-safe:animate-[rise-in_0.5s_ease-out] mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-xs tracking-wide text-azulejo/60 uppercase">
            {listing.city}, {listing.country}
          </p>
          <h1
            className={`${displayFont.className} text-3xl font-semibold text-azulejo sm:text-4xl`}
          >
            {t('confirmBooking')}
          </h1>
        </div>

        <ListingSummaryCard title={listing.title} image={listing.images[0]!}>
          <p className="font-mono text-sm text-azulejo/80">
            {t('perNightSleeps', {
              price: format.number(listing.price, {
                style: 'currency',
                currency: listing.currency,
              }),
              count: listing.maxGuests,
            })}
          </p>
          {listing.availability && (
            <p data-testid="stay-summary" className="font-mono text-sm text-azulejo/80">
              {format.dateTime(new Date(listing.availability.checkIn), { dateStyle: 'medium' })} –{' '}
              {format.dateTime(new Date(listing.availability.checkOut), { dateStyle: 'medium' })} ·{' '}
              {tCommon('nights', { count: listing.availability.nights })} ·{' '}
              {tCommon('total', {
                total: format.number(listing.availability.totalPrice, {
                  style: 'currency',
                  currency: listing.currency,
                }),
              })}
            </p>
          )}
        </ListingSummaryCard>

        <div className="h-px w-full bg-azulejo/10" />

        <BookingForm
          listingId={listing.id}
          maxGuests={listing.maxGuests}
          checkIn={hasDateRange ? checkIn : undefined}
          checkOut={hasDateRange ? checkOut : undefined}
          guests={hasGuestCount ? requestedGuests : undefined}
          guestName={session.name}
          guestEmail={session.email}
        />
      </div>
    </main>
  );
}
