import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

type ListingGalleryProps = {
  images: string[];
  title: string;
};

export function ListingGallery({ images, title }: ListingGalleryProps) {
  return (
    <Carousel className="w-full">
      <CarouselContent>
        {images.map((image, index) => (
          <CarouselItem key={image}>
            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
              <Image
                src={image}
                alt={`${title} — photo ${index + 1} of ${images.length}`}
                fill
                // The first photo is the largest above-the-fold element, so it's
                // eagerly loaded/preloaded; the rest stay lazy (next/image's default).
                priority={index === 0}
                sizes="(min-width: 768px) 768px, 100vw"
                className="object-cover"
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      {images.length > 1 && (
        <>
          <CarouselPrevious />
          <CarouselNext />
        </>
      )}
    </Carousel>
  );
}
