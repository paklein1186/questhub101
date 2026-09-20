-- Gratuité au niveau de l'agent : valable partout où il est utilisé (guilde, pods, quêtes),
-- pour les membres ou les admins de l'entité qui le possède (guilde ou entreprise).
ALTER TABLE public.agents
  ADD COLUMN free_scope text NOT NULL DEFAULT 'nobody'
  CHECK (free_scope IN ('nobody', 'owner_admins', 'owner_members'));
