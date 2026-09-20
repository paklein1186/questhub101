ALTER TABLE public.unit_agents
  ADD COLUMN free_for text NOT NULL DEFAULT 'nobody'
  CHECK (free_for IN ('nobody', 'admins', 'members'));