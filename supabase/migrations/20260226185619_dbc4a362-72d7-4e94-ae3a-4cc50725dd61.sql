
-- Add membership fields to guilds table
ALTER TABLE public.guilds
  ADD COLUMN IF NOT EXISTS enable_membership boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS membership_style text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS entry_fee_credits integer,
  ADD COLUMN IF NOT EXISTS members_only_quests boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS members_only_events boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS members_only_voting boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS membership_benefits_text text,
  ADD COLUMN IF NOT EXISTS membership_commitments_text text,
  ADD COLUMN IF NOT EXISTS redistribution_percent integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS member_xp_bonus_percent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS membership_duration_months integer;

-- Create user_guild_memberships table
CREATE TABLE IF NOT EXISTS public.user_guild_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guild_id uuid NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'guest',
  joined_at timestamptz NOT NULL DEFAULT now(),
  membership_expires_at timestamptz,
  UNIQUE (user_id, guild_id)
);

ALTER TABLE public.user_guild_memberships ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read their own membership
CREATE POLICY "Users can read own membership"
  ON public.user_guild_memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS: Anyone can read memberships for a guild (for member counts, etc.)
CREATE POLICY "Anyone can read guild memberships"
  ON public.user_guild_memberships FOR SELECT
  TO authenticated
  USING (true);

-- RLS: Users can insert their own membership
CREATE POLICY "Users can insert own membership"
  ON public.user_guild_memberships FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS: Users can update their own membership
CREATE POLICY "Users can update own membership"
  ON public.user_guild_memberships FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS: Users can delete their own membership
CREATE POLICY "Users can delete own membership"
  ON public.user_guild_memberships FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS: Admins can manage all memberships
CREATE POLICY "Admins can manage memberships"
  ON public.user_guild_memberships FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
