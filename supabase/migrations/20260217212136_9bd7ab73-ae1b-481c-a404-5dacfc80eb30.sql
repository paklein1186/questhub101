
-- Phase 2: Plan restructuring & Class C shares

-- 1. Add is_public column to subscription_plans for hiding legacy plans
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

-- 2. Hide old plans (kept for existing subscribers, not shown to new users)
UPDATE subscription_plans SET is_public = false WHERE code IN ('STARTER', 'CREATOR', 'CATALYST', 'VISIONARY');

-- 3. Insert new PRO plan
INSERT INTO subscription_plans (
  code, name, description, monthly_price_amount, monthly_price_currency,
  free_quests_per_week, max_guild_memberships, max_pods, max_services_active, max_courses,
  xp_multiplier, stripe_price_id, monthly_included_credits, visibility_ranking,
  ai_muse_mode, can_create_company, custom_guild_tools, commission_discount_percentage,
  max_territories, can_create_territory, max_attachment_size_mb,
  partnership_proposals_enabled, fundraising_tools_enabled, ai_agents_enabled,
  territory_intelligence_enabled, memory_engine_enabled, broadcast_enabled, is_public
) VALUES (
  'PRO', 'Pro', 'Larger credit allocation, reduced commission, advanced tools.', 29.00, 'EUR',
  10, NULL, NULL, NULL, NULL,
  1.2, NULL, 200, 'priority',
  'advanced', true, true, 20.00,
  3, true, 50,
  true, true, true,
  true, true, true, true
);

-- 4. Insert new TERRITORY_BUILDER plan
INSERT INTO subscription_plans (
  code, name, description, monthly_price_amount, monthly_price_currency,
  free_quests_per_week, max_guild_memberships, max_pods, max_services_active, max_courses,
  xp_multiplier, stripe_price_id, monthly_included_credits, visibility_ranking,
  ai_muse_mode, can_create_company, custom_guild_tools, commission_discount_percentage,
  max_territories, can_create_territory, max_attachment_size_mb,
  partnership_proposals_enabled, fundraising_tools_enabled, ai_agents_enabled,
  territory_intelligence_enabled, memory_engine_enabled, broadcast_enabled, is_public
) VALUES (
  'TERRITORY_BUILDER', 'Territory Builder', 'Full territorial management, governance, and analytics.', 199.00, 'EUR',
  30, NULL, NULL, NULL, NULL,
  1.5, NULL, 500, 'top',
  'pro', true, true, 40.00,
  NULL, true, 100,
  true, true, true,
  true, true, true, true
);

-- 5. Update FREE plan description
UPDATE subscription_plans SET
  description = 'Access marketplace, small monthly credit mint, standard commission.'
WHERE code = 'FREE';

-- 6. Create ecosystem_treasury_allocations table for treasury tracking
CREATE TABLE IF NOT EXISTS public.ecosystem_treasury_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_label TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_surplus NUMERIC NOT NULL DEFAULT 0,
  reinvestment_amount NUMERIC NOT NULL DEFAULT 0,
  shareholder_amount NUMERIC NOT NULL DEFAULT 0,
  treasury_amount NUMERIC NOT NULL DEFAULT 0,
  solidarity_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ecosystem_treasury_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage treasury allocations"
  ON public.ecosystem_treasury_allocations
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view treasury allocations"
  ON public.ecosystem_treasury_allocations
  FOR SELECT
  TO authenticated
  USING (true);
