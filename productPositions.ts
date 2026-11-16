import { supabase } from '@/lib/supabase';

export async function setProductPosition(slug: string, position: number) {
  const { error } = await supabase.rpc('admin_set_product_position', { p_slug: slug, p_sort_order: position });
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, '') || 'Position could not be saved.');
}

export async function fetchProductPositions(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('admin_product_positions');
  if (error || !Array.isArray(data)) throw new Error('Product positions could not be loaded. Please try again.');
  return Object.fromEntries(
    (data as { slug: string; sort_order: number | string }[]).map((row) => [row.slug, Number(row.sort_order)]),
  );
}
