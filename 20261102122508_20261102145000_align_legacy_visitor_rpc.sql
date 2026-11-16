/*
# Align legacy visitor tracking RPC

1. Modified Functions
- The older one-argument `record_visit` overload now uses the same country-aware and admin-excluding implementation as the current two-argument function.

2. Security
- Direct calls through either supported function signature cannot add visits for an admin caller.
*/

CREATE OR REPLACE FUNCTION public.record_visit(p_visitor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
PERFORM public.record_visit(p_visitor_id, NULL::text);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.record_visit(uuid) TO anon, authenticated;
