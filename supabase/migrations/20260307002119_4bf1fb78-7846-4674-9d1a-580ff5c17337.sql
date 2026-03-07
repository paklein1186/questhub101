
-- Guild wallets table
CREATE TABLE IF NOT EXISTS public.guild_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  gameb_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(guild_id)
);

ALTER TABLE public.guild_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guild wallets readable by members" ON public.guild_wallets
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Guild wallets updatable by system" ON public.guild_wallets
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Territory token flows table
CREATE TABLE IF NOT EXISTS public.territory_token_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  quest_id UUID REFERENCES public.quests(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'quest_territory_share',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.territory_token_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Territory token flows readable by all" ON public.territory_token_flows
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Territory token flows insertable" ON public.territory_token_flows
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Add gameb_balance to territories if not present
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS gameb_balance NUMERIC NOT NULL DEFAULT 0;
