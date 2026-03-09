
-- Table to store multi-guild give-back distribution splits
CREATE TABLE public.giveback_distribution_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL DEFAULT 'GUILD', -- 'GUILD' or 'PLATFORM'
  guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
  percentage INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.giveback_distribution_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own distribution rules"
ON public.giveback_distribution_rules
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index for fast lookup
CREATE INDEX idx_giveback_distribution_user ON public.giveback_distribution_rules(user_id);
