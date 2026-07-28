import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchListing } from '@/lib/api';
import { amenityLabel } from '@/lib/utils';
import { ListingGallery } from './_components/ListingGallery';

type ListingDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ListingDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await fetchListing(id);
  if (!listing) {
    notFound();
  }

  return {
    title: listing.title,
    description: `${listing.title} in ${listing.city}, ${listing.country} — ${listing.price} ${listing.currency} / night.`,
  };
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params;
  const listing = await fetchListing(id);

  if (!listing) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4">
      <ListingGallery images={listing.images} title={listing.title} />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{listing.title}</h1>
        <p className="text-muted-foreground">
          {listing.city}, {listing.country}
        </p>
        <p className="text-lg font-semibold">
          {listing.price} {listing.currency}{' '}
          <span className="text-sm font-normal text-muted-foreground">/ night</span>
        </p>
        <p className="text-sm text-muted-foreground">Sleeps up to {listing.maxGuests} guests</p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Amenities</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {listing.amenities.map((amenity) => (
            <li key={amenity} className="text-sm text-muted-foreground">
              {amenityLabel(amenity)}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
