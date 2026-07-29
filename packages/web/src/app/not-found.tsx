import Link from 'next/link';
import { displayFont } from '@/app/_components/fonts';
import { TileMark } from '@/app/_components/TileMark';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-limestone px-6 py-16 text-center">
      <div className="motion-safe:animate-[rise-in_0.5s_ease-out] flex flex-col items-center gap-3">
        <TileMark aria-hidden="true" className="size-10 text-azulejo/20" />
        <h1 className={`${displayFont.className} text-3xl font-semibold text-azulejo sm:text-4xl`}>
          We couldn&apos;t find that page
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          It may have been removed, or the link might be broken.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-3 bg-terracotta text-white hover:bg-terracotta/90 focus-visible:ring-terracotta/40"
        >
          <Link href="/search">Back to search</Link>
        </Button>
      </div>
    </main>
  );
}
