
-- eco_impact_rules: rules for XP/credits/badges based on ecosystem indicators
CREATE TABLE IF NOT EXISTS public.eco_impact_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  natural_system_id uuid REFERENCES public.natural_systems(id) ON DELETE SET NULL,
  target_indicator text NOT NULL,
  comparison_type text NOT NULL DEFAULT 'INCREASE',
  target_value jsonb NOT NULL DEFAULT '0',
  reward_type text NOT NULL DEFAULT 'XP',
  reward_amount integer NOT NULL DEFAULT 10,
  evaluation_period text NOT NULL DEFAULT 'ON_COMPLETE',
  is_active boolean NOT NULL DEFAULT true,
  is_fulfilled boolean NOT NULL DEFAULT false,
  fulfilled_at timestamptz,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.eco_impact_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eco_impact_rules_select" ON public.eco_impact_rules
  FOR SELECT USING (true);
CREATE POLICY "eco_impact_rules_insert" ON public.eco_impact_rules
  FOR INSERT WITH CHECK (auth.uid() = created_by_user_id);
CREATE POLICY "eco_impact_rules_update" ON public.eco_impact_rules
  FOR UPDATE USING (auth.uid() = created_by_user_id);
CREATE POLICY "eco_impact_rules_delete" ON public.eco_impact_rules
  FOR DELETE USING (auth.uid() = created_by_user_id);

-- eco_impact_events: log when a rule is triggered
CREATE TABLE IF NOT EXISTS public.eco_impact_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.eco_impact_rules(id) ON DELETE CASCADE,
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  natural_system_id uuid REFERENCES public.natural_systems(id) ON DELETE SET NULL,
  indicator_name text NOT NULL,
  value_before jsonb,
  value_after jsonb,
  reward_type text NOT NULL,
  reward_amount integer NOT NULL,
  narrative_text text,
  beneficiary_user_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.eco_impact_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eco_impact_events_select" ON public.eco_impact_events
  FOR SELECT USING (true);

-- eco_narratives: procedural storytelling entries for living systems
CREATE TABLE IF NOT EXISTS public.eco_narratives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  natural_system_id uuid REFERENCES public.natural_systems(id) ON DELETE CASCADE,
  territory_id uuid REFERENCES public.territories(id) ON DELETE SET NULL,
  quest_id uuid REFERENCES public.quests(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.eco_impact_events(id) ON DELETE SET NULL,
  narrative_type text NOT NULL DEFAULT 'IMPACT',
  narrative_text text NOT NULL,
  indicator_key text,
  indicator_before jsonb,
  indicator_after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.eco_narratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eco_narratives_select" ON public.eco_narratives
  FOR SELECT USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_eco_impact_rules_quest ON public.eco_impact_rules(quest_id);
CREATE INDEX IF NOT EXISTS idx_eco_impact_rules_active ON public.eco_impact_rules(is_active, is_fulfilled);
CREATE INDEX IF NOT EXISTS idx_eco_impact_events_quest ON public.eco_impact_events(quest_id);
CREATE INDEX IF NOT EXISTS idx_eco_narratives_ns ON public.eco_narratives(natural_system_id);
CREATE INDEX IF NOT EXISTS idx_eco_narratives_quest ON public.eco_narratives(quest_id);
