import { Skeleton } from '@/components/ui/skeleton';

export function ResultsSkeleton() {
  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-full space-y-4 overflow-y-auto p-4 md:w-1/2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex gap-3 rounded-lg border border-border p-3">
            <Skeleton className="size-20 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col justify-center gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        ))}
      </div>
      <div className="relative hidden flex-1 bg-muted/40 md:block" aria-hidden="true" />
    </div>
  );
}
