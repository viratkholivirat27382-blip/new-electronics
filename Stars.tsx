import { Star } from 'lucide-react';

export function Stars({ rating, iconClassName = 'h-4 w-4' }: { rating: number; iconClassName?: string }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`Rated ${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className={`${iconClassName} ${index < rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'}`} />
      ))}
    </div>
  );
}
