CREATE TABLE IF NOT EXISTS public.products_backup_20261031 AS SELECT * FROM public.products;
ALTER TABLE public.products_backup_20261031 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.products_backup_20261031 FROM anon, authenticated;