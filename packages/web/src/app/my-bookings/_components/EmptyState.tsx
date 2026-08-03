import { displayFont } from '@/app/_components/fonts';
import { TileMark } from '@/app/_components/TileMark';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-azulejo/10">
      <div className="flex size-16 items-center justify-center rounded-xl bg-gradient-to-br from-azulejo-light/15 via-limestone to-gold/10 ring-1 ring-azulejo/10">
        <TileMark className="size-8 text-azulejo/40" />
      </div>
      <p className={`${displayFont.className} text-lg font-semibold text-azulejo`}>
        No bookings yet
      </p>
      <p className="text-sm text-muted-foreground">
        When you book a stay, it&apos;ll show up here.
      </p>
    </div>
  );
}
