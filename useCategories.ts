import { useContext } from 'react';
import { CategoriesContext, type CategoriesContextValue } from '@/context/CategoriesContext';

export function useCategories(): CategoriesContextValue {
  const value = useContext(CategoriesContext);
  if (!value) throw new Error('useCategories must be used inside CategoriesProvider');
  return value;
}
