-- Usage gratuit d'un agent pour certains utilisateurs d'un espace (guilde, pod,
-- quête) : réglé par le propriétaire de l'agent au moment de l'attachement,
-- ou plus tard. Appliqué côté serveur (unit-agent-chat) : sans effet si
-- l'attachement n'a pas été fait par le propriétaire de l'agent.
ALTER TABLE public.unit_agents
  ADD COLUMN free_for text NOT NULL DEFAULT 'nobody'
  CHECK (free_for IN ('nobody', 'admins', 'members'));
