
CREATE TABLE public.guild_mcp_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY['read','write']::text[],
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX guild_mcp_tokens_guild_id_idx ON public.guild_mcp_tokens(guild_id);
CREATE INDEX guild_mcp_tokens_hash_idx ON public.guild_mcp_tokens(token_hash) WHERE revoked_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guild_mcp_tokens TO authenticated;
GRANT ALL ON public.guild_mcp_tokens TO service_role;

ALTER TABLE public.guild_mcp_tokens ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_guild_admin(_guild_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.guilds g
    WHERE g.id = _guild_id AND g.created_by_user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.guild_members gm
    WHERE gm.guild_id = _guild_id
      AND gm.user_id = _user_id
      AND gm.role = 'ADMIN'::guild_member_role
  );
$$;

CREATE POLICY "Guild admins view their tokens"
  ON public.guild_mcp_tokens FOR SELECT TO authenticated
  USING (public.is_guild_admin(guild_id, auth.uid()));

CREATE POLICY "Guild admins create tokens"
  ON public.guild_mcp_tokens FOR INSERT TO authenticated
  WITH CHECK (public.is_guild_admin(guild_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Guild admins update tokens"
  ON public.guild_mcp_tokens FOR UPDATE TO authenticated
  USING (public.is_guild_admin(guild_id, auth.uid()))
  WITH CHECK (public.is_guild_admin(guild_id, auth.uid()));

CREATE POLICY "Guild admins delete tokens"
  ON public.guild_mcp_tokens FOR DELETE TO authenticated
  USING (public.is_guild_admin(guild_id, auth.uid()));
