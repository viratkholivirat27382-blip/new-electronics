import { useCallback, useEffect, useState } from 'react';
import { fetchPublishedReviews, type Review } from '@/lib/reviews';

export function useReviews() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetchPublishedReviews()
      .then((data) => {
        if (active) {
          setReviews(data);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { reviews, error, retry };
}
