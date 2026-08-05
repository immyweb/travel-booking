import type { Metadata } from 'next';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { displayFont } from '@/app/_components/fonts';
import { TileMark } from '@/app/_components/TileMark';
import { Link, redirect } from '@/i18n/navigation';
import { languageAlternates } from '@/i18n/metadata';
import { fetchMyBookings, fetchSession } from '@/lib/api';
import { EmptyState } from './_components/EmptyState';

type MyBookingsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: MyBookingsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MyBookingsPage' });

  return {
    title: t('heading'),
    alternates: { languages: languageAlternates('/my-bookings') },
  };
}

export default async function MyBookingsPage() {
  // Same session-gate pattern as /listings/[id]/book: checked before the
  // (session-scoped) bookings fetch, not after, so a signed-out customer
  // never triggers a request that's guaranteed to 401.
  const session = await fetchSession();
  if (!session) {
    const locale = await getLocale();
    return redirect({ href: `/sign-in?redirect=${encodeURIComponent('/my-bookings')}`, locale });
  }

  const [bookings, t, tCommon, format] = await Promise.all([
    fetchMyBookings(),
    getTranslations('MyBookingsPage'),
    getTranslations('Common'),
    getFormatter(),
  ]);

  return (
    <main className="flex flex-1 flex-col bg-limestone">
      <div className="motion-safe:animate-[rise-in_0.5s_ease-out] mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
        <div className="relative flex flex-col gap-1.5">
          <TileMark className="pointer-events-none absolute -top-2 right-0 -z-10 size-28 text-azulejo/[0.04] sm:size-36" />
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-xs tracking-wide text-azulejo/60 uppercase">
              {t('eyebrow')}
            </p>
            {bookings.length > 0 && (
              <p className="font-mono text-xs tracking-wide text-azulejo/50 uppercase">
                {t('staysCount', { count: bookings.length })}
              </p>
            )}
          </div>
          <h1
            className={`${displayFont.className} text-3xl font-semibold text-azulejo sm:text-4xl`}
          >
            {t('heading')}
          </h1>
        </div>

        {bookings.length === 0 ? (
          <EmptyState />
        ) : (
          <ul aria-label={t('bookingsListLabel')} className="flex flex-col gap-4">
            {bookings.map((booking) => (
              <li key={booking.id}>
                <Link
                  href={`/bookings/${booking.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-azulejo/10 shadow-sm transition hover:bg-limestone/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta sm:p-5"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-azulejo-light/15 via-limestone to-gold/10 ring-1 ring-azulejo/10 sm:size-14">
                    <TileMark className="size-5 text-azulejo/50 sm:size-6" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="font-mono text-sm font-semibold text-azulejo sm:text-base">
                      {format.dateTime(new Date(booking.checkIn), { dateStyle: 'medium' })} –{' '}
                      {format.dateTime(new Date(booking.checkOut), { dateStyle: 'medium' })} ·{' '}
                      {tCommon('nights', { count: booking.nights })}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{booking.guestName}</p>
                  </div>
                  <div className="hidden h-10 w-px shrink-0 bg-azulejo/10 sm:block" />
                  <p className="shrink-0 font-mono text-base font-bold text-azulejo sm:text-lg">
                    {tCommon('total', {
                      total: format.number(booking.totalPrice, {
                        style: 'currency',
                        currency: booking.currency,
                      }),
                    })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
