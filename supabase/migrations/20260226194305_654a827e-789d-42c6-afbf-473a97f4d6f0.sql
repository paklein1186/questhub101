
-- 1. Guild contribution weight tables
CREATE TABLE public.guild_contribution_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL,
  task_type TEXT NOT NULL,
  weight_factor NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(guild_id, task_type)
);

ALTER TABLE public.guild_contribution_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read guild weights"
  ON public.guild_contribution_weights FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Guild admins can manage weights"
  ON public.guild_contribution_weights FOR ALL
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.guild_members gm
      WHERE gm.guild_id = guild_contribution_weights.guild_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'ADMIN'::guild_member_role
    )
  );

-- 2. Add value-pie columns to contribution_logs
ALTER TABLE public.contribution_logs
  ADD COLUMN IF NOT EXISTS task_type TEXT,
  ADD COLUMN IF NOT EXISTS base_units NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weight_factor NUMERIC(4,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS weighted_units NUMERIC(12,2) DEFAULT 0;

-- 3. Quest value pie log
CREATE TABLE public.quest_value_pie_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL,
  contributor_id UUID NOT NULL,
  weighted_units NUMERIC(12,2) NOT NULL DEFAULT 0,
  share_percent NUMERIC(6,4) NOT NULL DEFAULT 0,
  gameb_tokens_awarded NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quest_value_pie_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read value pie logs"
  ON public.quest_value_pie_log FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Quest owners can insert value pie logs"
  ON public.quest_value_pie_log FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = quest_value_pie_log.quest_id
      AND q.owner_id = auth.uid()::text
    )
  );

-- 4. Add value_pie_calculated flag to quests
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS value_pie_calculated BOOLEAN DEFAULT false;
