CREATE TABLE public.agent_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  trigger text NOT NULL DEFAULT 'manual' CHECK (trigger IN ('manual', 'cron')),
  dry_run boolean NOT NULL DEFAULT false,
  triggered_by uuid,
  ok boolean NOT NULL,
  duration_ms integer,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_agent_sync_runs_agent ON public.agent_sync_runs (agent_id, created_at DESC);

GRANT SELECT ON public.agent_sync_runs TO authenticated;
GRANT ALL ON public.agent_sync_runs TO service_role;

ALTER TABLE public.agent_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers read sync runs" ON public.agent_sync_runs FOR SELECT TO authenticated
USING (public.can_manage_agent(agent_id, auth.uid()));