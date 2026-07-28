import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-lg font-medium">We couldn&apos;t find that page</h1>
      <p className="text-sm text-muted-foreground">
        It may have been removed, or the link might be broken.
      </p>
      <Link href="/search" className="text-sm font-medium underline underline-offset-4">
        Back to search
      </Link>
    </main>
  );
}
