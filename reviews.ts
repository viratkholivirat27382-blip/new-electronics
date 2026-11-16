import { supabase } from '@/lib/supabase';

export type ShopperGroup = 'men' | 'women';

export type Review = {
  id: string;
  reviewer_name: string;
  reviewer_location: string;
  shopper_group: ShopperGroup;
  rating: number;
  title: string;
  body: string;
  avatar_url: string | null;
};

export function averageRating(reviews: Review[]) {
  return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
}

function isReview(row: unknown): row is Review {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.reviewer_name === 'string' &&
    typeof r.reviewer_location === 'string' &&
    (r.shopper_group === 'men' || r.shopper_group === 'women') &&
    typeof r.rating === 'number' &&
    typeof r.title === 'string' &&
    typeof r.body === 'string' &&
    (r.avatar_url === null || typeof r.avatar_url === 'string')
  );
}

export async function fetchPublishedReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, reviewer_name, reviewer_location, shopper_group, rating, title, body, avatar_url')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) throw new Error('We could not load customer reviews right now.');
  if (!Array.isArray(data)) throw new Error('Unexpected review data received.');
  return data.filter(isReview);
}
