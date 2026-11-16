import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchCategories, type CategoryDef } from '@/lib/categories';

export type CategoriesContextValue = {
  categories: CategoryDef[] | null;
  error: string | null;
  reload: () => void;
};

export const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CategoryDef[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetchCategories()
      .then((data) => {
        if (!active) return;
        setCategories(data);
        setError(null);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const value = useMemo(() => ({ categories, error, reload }), [categories, error, reload]);

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}
