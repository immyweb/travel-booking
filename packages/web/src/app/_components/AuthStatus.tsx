'use client';

import type { SessionUser } from '@travel-booking/core';
import { useTranslations } from 'next-intl';
import { use } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { submitSignOut } from './_actions';

type AuthStatusProps = {
  sessionPromise: Promise<SessionUser | null>;
};

// Split out of HomeHeader (which starts this fetch but doesn't await it) so
// the session lookup's Suspense boundary covers only the part of the header
// that actually needs it — mirrors DealsSection/SearchResultsSection's own
// promise-prop + use() pattern.
export function AuthStatus({ sessionPromise }: AuthStatusProps) {
  const session = use(sessionPromise);
  const t = useTranslations('HomeHeader');
  const tCommon = useTranslations('Common');

  if (session) {
    return (
      <>
        <span className="hidden text-sm text-white/80 sm:inline">
          {t('welcomeBack')}{' '}
          <Link href="/my-bookings" className="font-medium text-white hover:underline">
            {session.name}
          </Link>
        </span>
        <form action={submitSignOut}>
          <Button
            type="submit"
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
          >
            {tCommon('signOut')}
          </Button>
        </form>
      </>
    );
  }

  return (
    <>
      <Link href="/sign-in" className="text-sm font-medium hover:underline">
        {tCommon('signIn')}
      </Link>
      <Link href="/sign-up" className="text-sm font-medium hover:underline">
        {tCommon('signUp')}
      </Link>
    </>
  );
}
