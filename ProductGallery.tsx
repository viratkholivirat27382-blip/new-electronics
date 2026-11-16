import { Heart } from 'lucide-react';

type ProductGalleryProps = {
  images: string[];
  name: string;
  activeIndex: number;
  onSelect: (index: number) => void;
  saved: boolean;
  onToggleWishlist: () => void;
};

export function ProductGallery({ images, name, activeIndex, onSelect, saved, onToggleWishlist }: ProductGalleryProps) {
  const galleryImages = Array.from({ length: 5 }, (_, index) => images[index % images.length]);
  const mainImage = galleryImages[activeIndex];

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row">
      <div className="grid grid-cols-5 gap-2 lg:w-[72px] lg:shrink-0 lg:grid-cols-1">
          {galleryImages.map((src, index) => (

            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => onSelect(index)}
              aria-label={`Show image ${index + 1}`}
              aria-pressed={index === activeIndex}
              className={`overflow-hidden rounded-lg border-2 bg-neutral-100 transition-colors ${
                index === activeIndex ? 'border-lime-400' : 'border-transparent hover:border-neutral-300'
              }`}
            >
              <img src={src} alt="" className="h-auto w-full object-contain" />
            </button>
          ))}
        </div>

      <div className="relative flex min-h-[420px] flex-1 overflow-hidden rounded-2xl bg-neutral-100 lg:min-h-[620px]">
        {mainImage && <img src={mainImage} alt={`${name}, view ${activeIndex + 1}`} className="h-full w-full object-contain" />}
        <button
          type="button"
          onClick={onToggleWishlist}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition-transform hover:scale-105"
        >
          <Heart className={`h-4 w-4 ${saved ? 'fill-ink text-ink' : 'text-ink'}`} />
        </button>
      </div>
    </div>
  );
}
