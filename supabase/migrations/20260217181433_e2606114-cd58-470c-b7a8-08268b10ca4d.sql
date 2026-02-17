
-- Fix: make economy_stats view use security_invoker
DROP VIEW IF EXISTS public.economy_stats;

CREATE VIEW public.economy_stats WITH (security_invoker = true) AS
SELECT
  (SELECT COALESCE(SUM(credits_balance), 0) FROM public.profiles WHERE demurrage_exempt = false) AS total_credits_in_circulation,
  (SELECT COALESCE(credits_balance, 0) FROM public.profiles WHERE demurrage_exempt = true LIMIT 1) AS treasury_balance,
  (SELECT COALESCE(SUM(lifetime_credits_faded), 0) FROM public.profiles) AS total_lifetime_faded,
  (SELECT COALESCE(SUM(fade_amount), 0) FROM public.demurrage_log WHERE created_at >= date_trunc('month', now())) AS monthly_faded,
  (SELECT COALESCE(SUM(amount), 0) FROM public.credit_transactions WHERE amount > 0 AND created_at >= date_trunc('month', now())) AS monthly_minted,
  (SELECT COUNT(*) FROM public.profiles WHERE credits_balance > 0 AND demurrage_exempt = false) AS active_holders;

-- Grant anon/authenticated access to economy_stats for public dashboard
GRANT SELECT ON public.economy_stats TO anon, authenticated;
