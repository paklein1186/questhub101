
-- Table to track which agents are admitted to which units (guilds, pods, quests)
CREATE TABLE public.unit_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('guild', 'pod', 'quest')),
  unit_id UUID NOT NULL,
  admitted_by_user_id UUID NOT NULL,
  admitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (agent_id, unit_type, unit_id)
);

-- Enable RLS
ALTER TABLE public.unit_agents ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read unit agents
CREATE POLICY "Authenticated users can view unit agents"
ON public.unit_agents FOR SELECT TO authenticated
USING (true);

-- Only unit admins can insert (enforced in app logic, but allow authenticated insert)
CREATE POLICY "Authenticated users can insert unit agents"
ON public.unit_agents FOR INSERT TO authenticated
WITH CHECK (auth.uid() = admitted_by_user_id);

-- Only the admitter or platform admins can update/delete
CREATE POLICY "Admitter can update unit agents"
ON public.unit_agents FOR UPDATE TO authenticated
USING (auth.uid() = admitted_by_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admitter can delete unit agents"
ON public.unit_agents FOR DELETE TO authenticated
USING (auth.uid() = admitted_by_user_id OR public.has_role(auth.uid(), 'admin'));
