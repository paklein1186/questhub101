
-- Agent trust scores table
CREATE TABLE public.agent_trust_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  owner_trust numeric NOT NULL DEFAULT 50,
  history_score numeric NOT NULL DEFAULT 50,
  guild_endorsements numeric NOT NULL DEFAULT 0,
  xp_level numeric NOT NULL DEFAULT 0,
  penalties numeric NOT NULL DEFAULT 0,
  total_score numeric NOT NULL DEFAULT 50,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agent_id)
);

ALTER TABLE public.agent_trust_scores ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read trust scores
CREATE POLICY "Anyone can read agent trust scores"
  ON public.agent_trust_scores FOR SELECT TO authenticated
  USING (true);

-- Only the agent owner or admin can update
CREATE POLICY "Owner or admin can manage trust scores"
  ON public.agent_trust_scores FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.agents WHERE id = agent_id AND creator_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
