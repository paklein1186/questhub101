
-- Add new feature-gating columns to subscription_plans
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS max_territories integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS can_create_territory boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_attachment_size_mb integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS partnership_proposals_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fundraising_tools_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_agents_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS territory_intelligence_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS memory_engine_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS broadcast_enabled boolean DEFAULT false;
