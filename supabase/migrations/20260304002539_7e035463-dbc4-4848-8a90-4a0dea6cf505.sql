
-- Create pi_triggers table for proactive Pi notifications
CREATE TABLE public.pi_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ
);

-- Index for fast polling
CREATE INDEX idx_pi_triggers_user_pending ON public.pi_triggers (user_id, status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.pi_triggers ENABLE ROW LEVEL SECURITY;

-- Users can read their own triggers
CREATE POLICY "Users can view own triggers"
  ON public.pi_triggers FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own triggers (to mark as acted/dismissed)
CREATE POLICY "Users can update own triggers"
  ON public.pi_triggers FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role / triggers can insert (no user-facing insert policy needed)
CREATE POLICY "Service can insert triggers"
  ON public.pi_triggers FOR INSERT
  WITH CHECK (true);
