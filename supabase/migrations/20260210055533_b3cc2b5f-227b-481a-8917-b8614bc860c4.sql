-- Rate limiting table
CREATE TABLE public.rate_limit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_rate_limit_user_action_time 
  ON public.rate_limit_entries (user_id, action_type, created_at DESC);

-- Auto-cleanup: delete entries older than 2 hours
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_entries WHERE created_at < now() - interval '2 hours';
$$;

-- RLS
ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- Only edge functions (service role) write to this table; users have no direct access
CREATE POLICY "No direct user access to rate limits"
  ON public.rate_limit_entries FOR ALL
  USING (false);
