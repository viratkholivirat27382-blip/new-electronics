import { BadgeCheck } from 'lucide-react';
import { SectionHeader } from '@/components/home/SectionHeader';
import { Stars } from '@/components/ui/Stars';
import { buttonOutline } from '@/components/ui/styles';
import type { Review } from '@/lib/reviews';
import { useReviews } from '@/lib/useReviews';

const CONTAINER = 'mx-auto max-w-7xl px-4 lg:px-8';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article
      className="flex min-h-[260px] flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:p-6"
    >
      <Stars rating={review.rating} />
      <h3 className="mt-3 line-clamp-2 text-base font-bold leading-snug text-ink">{review.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-600">{review.body}</p>
      <div className="mt-4 flex items-center gap-3 border-t border-neutral-100 pt-4">
        {review.avatar_url ? (
          <img
            src={review.avatar_url}
            alt={review.reviewer_name}
            loading="lazy"
            className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold tracking-wide text-white">
            {initials(review.reviewer_name)}
          </span>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-ink">{review.reviewer_name}</p>
            <BadgeCheck className="h-4 w-4 fill-lime-400 text-ink" aria-label="Verified buyer" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-lime-600">Verified</span>
          </div>
          <p className="text-xs text-neutral-500">{review.reviewer_location}</p>
        </div>
      </div>
    </article>
  );
}

function ReviewTrack({ reviews, ariaHidden = false }: { reviews: Review[]; ariaHidden?: boolean }) {
  return (
    <div className="flex shrink-0 gap-6 pr-6" aria-hidden={ariaHidden || undefined}>
      {reviews.map((review) => (
        <div key={review.id} className="w-[300px] shrink-0 sm:w-[360px]">
          <ReviewCard review={review} />
        </div>
      ))}
    </div>
  );
}

export function CustomerReviews() {
  const { reviews, error, retry } = useReviews();

  return (
    <section className="py-10 lg:py-12">
      <div className={CONTAINER}>
        <SectionHeader kicker="Customer stories" title="What our customers say" />

        {error && (
          <div role="alert" className="mt-6 border border-crimson-600 bg-crimson-700/10 p-6">
            <p className="text-sm">{error}</p>
            <button type="button" onClick={retry} className={`${buttonOutline} mt-4`}>Try again</button>
          </div>
        )}

        {!error && reviews === null && (
          <div className="mt-6 grid animate-pulse gap-6 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-64 rounded-2xl bg-neutral-100" />
            ))}
          </div>
        )}

        {reviews && reviews.length > 0 && (
          <div className="group mt-6 overflow-hidden">
            <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
              <ReviewTrack reviews={reviews} />
              <ReviewTrack reviews={reviews} ariaHidden />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
