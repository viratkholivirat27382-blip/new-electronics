import { useCallback, useEffect, useState } from 'react';
import { fetchActiveProducts, type Product } from '@/lib/catalog';

export function useActiveProducts() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetchActiveProducts()
      .then((data) => {
        if (active) {
          setProducts(data);
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

  return { products, error, retry };
}
