ALTER TABLE public.agents
  ADD COLUMN free_scope text NOT NULL DEFAULT 'nobody'
  CHECK (free_scope IN ('nobody', 'owner_admins', 'owner_members'));