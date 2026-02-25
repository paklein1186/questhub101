
-- ═══════════════════════════════════════════════════════════
-- 1. Biopoints balance on profiles
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS biopoints_balance INT NOT NULL DEFAULT 0;

-- ═══════════════════════════════════════════════════════════
-- 2. Biopoints transaction log
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.biopoints_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount INT NOT NULL,
  type TEXT NOT NULL,  -- ECO_QUEST_REWARD, HEALTH_IMPROVEMENT_BONUS, ADMIN_GRANT, BUDGET_ALLOCATION
  source TEXT,
  natural_system_id UUID REFERENCES public.natural_systems(id),
  quest_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.biopoints_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own biopoints" ON public.biopoints_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System inserts biopoints" ON public.biopoints_transactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','superadmin')));

-- ═══════════════════════════════════════════════════════════
-- 3. Biopoints budgets per natural system (funder/territory allocations)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.biopoints_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  natural_system_id UUID NOT NULL REFERENCES public.natural_systems(id) ON DELETE CASCADE,
  allocated_by_user_id UUID REFERENCES auth.users(id),
  territory_id UUID REFERENCES public.territories(id),
  total_budget INT NOT NULL DEFAULT 0,
  remaining_budget INT NOT NULL DEFAULT 0,
  health_threshold INT NOT NULL DEFAULT 5,  -- health_index improvement needed
  evaluation_months INT NOT NULL DEFAULT 6,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.biopoints_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active budgets" ON public.biopoints_budgets
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins and allocators manage budgets" ON public.biopoints_budgets
  FOR ALL TO authenticated
  USING (allocated_by_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','superadmin')))
  WITH CHECK (allocated_by_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','superadmin')));

-- ═══════════════════════════════════════════════════════════
-- 4. Health snapshots for tracking improvement over time
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.natural_system_health_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  natural_system_id UUID NOT NULL REFERENCES public.natural_systems(id) ON DELETE CASCADE,
  health_index INT NOT NULL,
  resilience_index INT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.natural_system_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view snapshots" ON public.natural_system_health_snapshots
  FOR SELECT USING (true);

CREATE POLICY "System inserts snapshots" ON public.natural_system_health_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','superadmin')));

-- ═══════════════════════════════════════════════════════════
-- 5. Eco quest reward config in cooperative_settings
-- ═══════════════════════════════════════════════════════════
INSERT INTO public.cooperative_settings (key, value) VALUES
  ('eco_quest_rewards', '{
    "base_rewards": {
      "observation": {"xp": 3, "credits": 2, "biopoints": 1},
      "restoration": {"xp": 7, "credits": 5, "biopoints": 3},
      "governance": {"xp": 5, "credits": 4, "biopoints": 2},
      "knowledge": {"xp": 4, "credits": 3, "biopoints": 1}
    },
    "sensitivity_range": [0.8, 1.3],
    "season_range": [0.8, 1.3],
    "collective_range": [1.0, 1.3],
    "collective_threshold": 5,
    "health_improvement_threshold": 5,
    "health_evaluation_months": 6
  }'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- ═══════════════════════════════════════════════════════════
-- 6. Indexes
-- ═══════════════════════════════════════════════════════════
CREATE INDEX idx_biopoints_tx_user ON public.biopoints_transactions(user_id);
CREATE INDEX idx_biopoints_tx_system ON public.biopoints_transactions(natural_system_id) WHERE natural_system_id IS NOT NULL;
CREATE INDEX idx_biopoints_budgets_system ON public.biopoints_budgets(natural_system_id) WHERE is_active = true;
CREATE INDEX idx_health_snapshots_system ON public.natural_system_health_snapshots(natural_system_id, recorded_at DESC);
