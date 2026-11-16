function reviewCountFromSlug(slug: string) {
  let hash = 0;
  for (const character of slug) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  const count = 34 + (hash % 624);
  return count === 50 ? 51 : count;
}

const RATING_BY_SLUG: Record<string, number> = {
  'pulse-watch-series-5': 4.6,
  'tailored-wool-blazer': 4.6,
  'cove-wireless-earbuds': 4.6,
  'orbit-smart-speaker': 4.5,
  'trail-grip-hiking-boot': 4.6,
  'stoneware-dinner-set-16-piece': 4.6,
  'glow-ritual-vitamin-c-serum': 4.7,
  'arc-mini-bluetooth-speaker': 4.5,
  'drift-linen-shirt': 4.4,
  'core-resistance-band-set': 4.4,
  'mist-hydrating-toner': 4.5,
  'nimbus-14-ultrabook': 4.7,
};

export function productReviewCount(slug: string) {
  return reviewCountFromSlug(slug);
}

export function productRating(slug: string) {
  return RATING_BY_SLUG[slug] ?? 4.8;
}
