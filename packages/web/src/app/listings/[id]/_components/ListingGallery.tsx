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
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted shadow-sm ring-1 ring-azulejo/10">
              <Image
                src={image}
                alt={`${title} — photo ${index + 1} of ${images.length}`}
                fill
                // The first photo is the largest above-the-fold element, so it's
                // eagerly loaded/preloaded; the rest stay lazy (next/image's default).
                priority={index === 0}
                sizes="(min-width: 1024px) 760px, 100vw"
                className="object-cover"
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      {images.length > 1 && (
        <>
          <CarouselPrevious className="left-3 border-none bg-white/90 text-azulejo shadow-md hover:bg-white" />
          <CarouselNext className="right-3 border-none bg-white/90 text-azulejo shadow-md hover:bg-white" />
        </>
      )}
    </Carousel>
  );
}
