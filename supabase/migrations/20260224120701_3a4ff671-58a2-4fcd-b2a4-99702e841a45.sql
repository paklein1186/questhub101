
-- Fix security definer view by setting security_invoker = true
ALTER VIEW public.graph_edges SET (security_invoker = true);
