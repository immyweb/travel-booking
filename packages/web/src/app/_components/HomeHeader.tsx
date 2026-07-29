import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { displayFont } from './fonts';
import { TileMark } from './TileMark';

export function HomeHeader() {
  return (
    <header className="sticky top-0 z-20 bg-azulejo text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <TileMark className="size-6 text-gold" />
          <span className={`${displayFont.className} text-lg font-semibold tracking-tight`}>
            Travel Booking
          </span>
        </Link>
        <Button
          asChild
          size="lg"
          className="bg-white text-azulejo hover:bg-white/90 focus-visible:ring-white/50"
        >
          <Link href="/search">Search stays</Link>
        </Button>
      </div>
    </header>
  );
}
