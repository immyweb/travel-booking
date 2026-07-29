import type { ReactNode } from 'react';
import Image from 'next/image';
import { displayFont } from '@/app/_components/fonts';

type ListingSummaryCardProps = {
  title: string;
  image: string;
  children: ReactNode;
};

// Shared by the Book and Booking Confirmation pages — both show the same
// image/title shell around a listing, but the detail lines beneath differ
// (per-night price + capacity vs. a confirmed stay's dates/total), so those
// are left to each caller as children rather than forced into one shape.
export function ListingSummaryCard({ title, image, children }: ListingSummaryCardProps) {
  return (
    <div className="flex gap-4 rounded-2xl bg-white p-4 ring-1 ring-azulejo/10 shadow-sm">
      <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-muted">
        <Image src={image} alt={title} fill sizes="128px" className="object-cover" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className={`${displayFont.className} text-lg font-semibold text-azulejo`}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
