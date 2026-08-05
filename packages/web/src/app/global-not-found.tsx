import type { Metadata } from 'next';
import Link from 'next/link';
import { TileMark } from '@/app/_components/TileMark';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { displayFont } from './_components/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Not Found',
  description: 'The page you are looking for does not exist.',
};

// Handles a request that falls entirely outside the [locale] segment (see
// app/[locale]/layout.tsx) — there's no resolved locale to render this in,
// so it's English-only, unlike app/[locale]/not-found.tsx which handles an
// in-app notFound() call within a known locale. Bypasses the app's normal
// layout tree (Next.js's global-not-found.js convention), so it must supply
// its own <html>/<body> and import its own globals/fonts rather than
// inheriting them from app/[locale]/layout.tsx.
export default function GlobalNotFound() {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <main className="flex flex-1 flex-col items-center justify-center bg-limestone px-6 py-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <TileMark aria-hidden="true" className="size-10 text-azulejo/20" />
            <h1
              className={`${displayFont.className} text-3xl font-semibold text-azulejo sm:text-4xl`}
            >
              We couldn&apos;t find that page
            </h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              It may have been removed, or the link might be broken.
            </p>
            <Link
              href="/search"
              className={cn(
                buttonVariants({
                  size: 'lg',
                  className:
                    'mt-3 bg-terracotta text-white hover:bg-terracotta/90 focus-visible:ring-terracotta/40',
                }),
              )}
            >
              Back to search
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
