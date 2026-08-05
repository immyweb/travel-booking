import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { fetchSession } from '@/lib/api';
import { submitSignOut } from './_actions';
import { displayFont } from './fonts';
import { LocaleSwitcher } from './LocaleSwitcher';
import { TileMark } from './TileMark';

export async function HomeHeader() {
  const [session, t, tCommon] = await Promise.all([
    fetchSession(),
    getTranslations('HomeHeader'),
    getTranslations('Common'),
  ]);

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
          {session ? (
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
          ) : (
            <>
              <Link href="/sign-in" className="text-sm font-medium hover:underline">
                {tCommon('signIn')}
              </Link>
              <Link href="/sign-up" className="text-sm font-medium hover:underline">
                {tCommon('signUp')}
              </Link>
            </>
          )}
          <Button
            asChild
            size="lg"
            className="bg-white text-azulejo hover:bg-white/90 focus-visible:ring-white/50"
          >
            <Link href="/search">{tCommon('searchStays')}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
