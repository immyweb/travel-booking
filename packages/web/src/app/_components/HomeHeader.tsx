import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { fetchSession } from '@/lib/api';
import { submitSignOut } from './_actions';
import { displayFont } from './fonts';
import { TileMark } from './TileMark';

export async function HomeHeader() {
  const session = await fetchSession();

  return (
    <header className="sticky top-0 z-20 bg-azulejo text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <TileMark className="size-6 text-gold" />
          <span className={`${displayFont.className} text-lg font-semibold tracking-tight`}>
            Travel Booking
          </span>
        </Link>
        <div className="flex items-center gap-4">
          {session ? (
            <>
              <span className="hidden text-sm text-white/80 sm:inline">
                Signed in as {session.name}
              </span>
              <form action={submitSignOut}>
                <Button
                  type="submit"
                  variant="ghost"
                  className="text-white hover:bg-white/10 hover:text-white"
                >
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="text-sm font-medium hover:underline">
                Sign in
              </Link>
              <Link href="/sign-up" className="text-sm font-medium hover:underline">
                Sign up
              </Link>
            </>
          )}
          <Button
            asChild
            size="lg"
            className="bg-white text-azulejo hover:bg-white/90 focus-visible:ring-white/50"
          >
            <Link href="/search">Search stays</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
