
-- 1. Add new columns to subscription_plans
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS monthly_included_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_services_active integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_courses integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS visibility_ranking text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS ai_muse_mode text NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS can_create_company boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_guild_tools boolean NOT NULL DEFAULT false;

-- 2. Update FREE plan
UPDATE public.subscription_plans SET
  name = 'Free',
  code = 'FREE',
  description = 'Get started with the basics. 20 credits/month included.',
  monthly_price_amount = 0,
  free_quests_per_week = 3,
  max_guild_memberships = 5,
  max_pods = 2,
  max_services_active = 2,
  max_courses = 1,
  xp_multiplier = 1.0,
  monthly_included_credits = 20,
  visibility_ranking = 'standard',
  ai_muse_mode = 'basic',
  can_create_company = false,
  custom_guild_tools = false,
  marketplace_fee_percent = 15,
  stripe_price_id = NULL
WHERE code = 'FREE';

-- 3. Update IMPACT_PLUS → CREATOR
UPDATE public.subscription_plans SET
  name = 'Creator',
  code = 'CREATOR',
  description = 'For active creators and changemakers who want more capacity and visibility.',
  monthly_price_amount = 14,
  free_quests_per_week = 10,
  max_guild_memberships = 15,
  max_pods = 5,
  max_services_active = 10,
  max_courses = 5,
  xp_multiplier = 1.5,
  monthly_included_credits = 100,
  visibility_ranking = 'priority',
  ai_muse_mode = 'advanced',
  can_create_company = false,
  custom_guild_tools = false,
  marketplace_fee_percent = 10,
  stripe_price_id = 'price_1SzRJpBttrYxqJqzGagEtDQu'
WHERE code = 'IMPACT_PLUS';

-- 4. Update ECOSYSTEM_PRO → CATALYST
UPDATE public.subscription_plans SET
  name = 'Catalyst',
  code = 'CATALYST',
  description = 'For ecosystem builders managing guilds, companies, and networks at scale.',
  monthly_price_amount = 39,
  free_quests_per_week = 30,
  max_guild_memberships = 50,
  max_pods = 10,
  max_services_active = NULL,
  max_courses = NULL,
  xp_multiplier = 2.0,
  monthly_included_credits = 250,
  visibility_ranking = 'top',
  ai_muse_mode = 'pro',
  can_create_company = true,
  custom_guild_tools = true,
  marketplace_fee_percent = 5,
  stripe_price_id = 'price_1SzRJqBttrYxqJqzZnmvFSgU'
WHERE code = 'ECOSYSTEM_PRO';

-- 5. Update user_subscriptions that reference old plan codes via profiles
UPDATE public.profiles SET current_plan_code = 'CREATOR' WHERE current_plan_code = 'IMPACT_PLUS';
UPDATE public.profiles SET current_plan_code = 'CATALYST' WHERE current_plan_code = 'ECOSYSTEM_PRO';

-- 6. Add mission budget fields to quests
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS mission_budget_min numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mission_budget_max numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'INVOICE';

-- 7. Add visibility boost columns for future use
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS is_boosted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS boost_expires_at timestamptz DEFAULT NULL;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS is_boosted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS boost_expires_at timestamptz DEFAULT NULL;
