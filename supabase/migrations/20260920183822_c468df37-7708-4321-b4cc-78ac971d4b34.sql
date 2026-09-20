-- Synchronisation avec un agent externe (ex. Space2) : compte agent, fiches
-- créées automatiquement et revendiquables, consentement email, suivi.

-- 1. Compte agent -----------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN is_agent boolean NOT NULL DEFAULT false;

ALTER TABLE public.agents
  ADD COLUMN agent_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN sync_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN sync_base_url text,
  ADD COLUMN sync_cursor text,
  ADD COLUMN last_sync_at timestamptz,
  ADD COLUMN last_sync_summary jsonb;

-- 2. Fiches créées automatiquement, à revendiquer ----------------------------
ALTER TABLE public.guilds
  ADD COLUMN auto_created_by_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  ADD COLUMN claimed_at timestamptz,
  ADD COLUMN claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Correspondance identifiant externe <-> guilde (et quête des besoins).
-- RLS activée sans policy : lisible uniquement avec la service role.
CREATE TABLE public.agent_external_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  entity_type text NOT NULL DEFAULT 'guild',
  entity_id uuid NOT NULL,
  needs_quest_id uuid,
  masked_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, external_id, entity_type)
);
ALTER TABLE public.agent_external_refs ENABLE ROW LEVEL SECURITY;

-- Revendication : le premier utilisateur connecté devient admin et créateur ;
-- le litige se traite ensuite par le signalement existant.
CREATE OR REPLACE FUNCTION public.claim_auto_guild(p_guild_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.guilds%ROWTYPE;
  agent_uid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO g FROM public.guilds WHERE id = p_guild_id FOR UPDATE;
  IF NOT FOUND OR g.auto_created_by_agent_id IS NULL OR g.claimed_at IS NOT NULL OR g.is_deleted THEN
    RAISE EXCEPTION 'guild is not claimable';
  END IF;

  SELECT agent_user_id INTO agent_uid FROM public.agents WHERE id = g.auto_created_by_agent_id;

  IF EXISTS (SELECT 1 FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = auth.uid()) THEN
    UPDATE public.guild_members SET role = 'ADMIN' WHERE guild_id = p_guild_id AND user_id = auth.uid();
  ELSE
    INSERT INTO public.guild_members (guild_id, user_id, role) VALUES (p_guild_id, auth.uid(), 'ADMIN');
  END IF;

  IF agent_uid IS NOT NULL THEN
    DELETE FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = agent_uid;
  END IF;

  UPDATE public.guilds
  SET claimed_at = now(), claimed_by = auth.uid(), created_by_user_id = auth.uid()
  WHERE id = p_guild_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_auto_guild(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_auto_guild(uuid) TO authenticated;

-- 3. Consentement au partage d'email avec un agent -----------------------------
CREATE TABLE public.agent_access_consents (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  consented_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  PRIMARY KEY (user_id, agent_id)
);
ALTER TABLE public.agent_access_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agent consents"
ON public.agent_access_consents FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());