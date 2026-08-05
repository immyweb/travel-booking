import { Skeleton } from '@/components/ui/skeleton';

export function ResultsSkeleton() {
  return (
    <div className="flex h-[520px] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-azulejo/10 sm:h-[600px]">
      <div className="w-full space-y-3 overflow-y-auto p-4 md:w-1/2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex gap-3 rounded-xl p-3 ring-1 ring-azulejo/10">
            <Skeleton className="size-20 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col justify-center gap-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        ))}
      </div>
      <div
        className="relative hidden flex-1 bg-gradient-to-br from-azulejo-light/10 via-limestone to-gold/10 md:block"
        aria-hidden="true"
      />
    </div>
  );
}
