import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { fetchSession } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AuthStatus } from './AuthStatus';
import { displayFont } from './fonts';
import { LocaleSwitcher } from './LocaleSwitcher';
import { TileMark } from './TileMark';

// Not awaited here: fetchSession is a live, uncached fetch to the auth
// service on every request (see lib/api.ts), and this header is mounted in
// the root layout above every page — awaiting it here would block the whole
// page (including fully static ones like About/Terms) on that round trip.
// Started immediately, but resolving it is deferred to AuthStatus's own
// Suspense boundary below, same pattern as Search's resultsPromise.
export async function HomeHeader() {
  const sessionPromise = fetchSession();
  const tCommon = await getTranslations('Common');

  return (
    <header className="sticky top-0 z-20 bg-azulejo text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <TileMark className="size-6 text-gold" />
          <span className={`${displayFont.className} text-lg font-semibold tracking-tight`}>
            {tCommon('appName')}
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <Suspense fallback={<AuthStatusSkeleton />}>
            <AuthStatus sessionPromise={sessionPromise} />
          </Suspense>
          <Link
            href="/search"
            className={cn(
              buttonVariants({
                size: 'lg',
                className: 'bg-white text-azulejo hover:bg-white/90 focus-visible:ring-white/50',
              }),
            )}
          >
            {tCommon('searchStays')}
          </Link>
        </div>
      </div>
    </header>
  );
}

// Sized to roughly match the sign-in/sign-up links AuthStatus renders when
// signed out, so the real content streaming in doesn't visibly reflow the
// header.
function AuthStatusSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="h-4 w-12 bg-white/20" />
      <Skeleton className="h-4 w-14 bg-white/20" />
    </div>
  );
}
