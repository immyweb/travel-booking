import { Skeleton } from '@/components/ui/skeleton';

export function ListingDetailSkeleton() {
  return (
    <main className="flex flex-1 flex-col bg-limestone">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:py-10">
        <Skeleton className="h-3 w-40" />

        <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px] lg:items-start">
          <div className="flex flex-col gap-8">
            <Skeleton className="aspect-[16/10] w-full rounded-2xl" />

            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-48" />
            </div>

            <div className="h-px w-full bg-azulejo/10" />

            <div className="flex flex-col gap-4">
              <Skeleton className="h-6 w-32" />
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <li key={index}>
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="rounded-2xl bg-white p-6 shadow-lg shadow-azulejo/5 ring-1 ring-azulejo/10">
              <div className="flex flex-col gap-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-11 w-full rounded-md" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
