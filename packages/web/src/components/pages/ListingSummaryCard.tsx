import type { ReactNode } from 'react';
import Image from 'next/image';

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
    <div className="flex gap-4 rounded-lg border border-border p-4">
      <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
        <Image src={image} alt={title} fill sizes="128px" className="object-cover" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="font-medium">{title}</h2>
        {children}
      </div>
    </div>
  );
}
