
-- Enums
DO $$ BEGIN
  CREATE TYPE public.content_sensitivity AS ENUM ('public', 'restricted', 'private');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_entity_type AS ENUM ('user', 'guild', 'entity', 'territory', 'platform', 'commons');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- monetized_action_types
CREATE TABLE IF NOT EXISTS public.monetized_action_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  base_price NUMERIC NOT NULL DEFAULT 1,
  default_sensitivity public.content_sensitivity NOT NULL DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.monetized_action_types (code, label, base_price) VALUES
  ('CRAWL_PAGE', 'Crawl a public page', 2),
  ('CRAWL_PRIVATE', 'Crawl non-public content', 6),
  ('READ_LIVING_DATA', 'Read living system data', 5),
  ('OBSERVE_CHAT', 'Ingest chat message', 1),
  ('SUMMARIZE_THREAD', 'Generate summary/report', 4),
  ('CREATE_POST', 'Auto-create a post', 3),
  ('PROPOSE_QUEST', 'Create a quest draft', 8),
  ('CREATE_ENTITY', 'Create entity/territory/item', 10),
  ('CALL_WEBHOOK_RESPONSE', 'Webhook response payload', 1),
  ('API_REQUEST_GENERIC', 'Generic API call', 1)
ON CONFLICT (code) DO NOTHING;

-- agent_plans
CREATE TABLE IF NOT EXISTS public.agent_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  quota_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.agent_plans (code, label, monthly_price, quota_json) VALUES
  ('CRAWL_LITE', 'Crawl Lite', 300, '{"CRAWL_PAGE": 200, "OBSERVE_CHAT": 500}'),
  ('CRAWL_PRO', 'Crawl Pro', 900, '{"CRAWL_PAGE": 800, "OBSERVE_CHAT": 2000}'),
  ('CRAWL_TERRITORY', 'Crawl Territory', 2500, '{"CRAWL_PAGE": 3000, "READ_LIVING_DATA": 500}')
ON CONFLICT (code) DO NOTHING;

-- agent_billing_profiles
CREATE TABLE IF NOT EXISTS public.agent_billing_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE UNIQUE,
  payer_type public.billing_entity_type NOT NULL DEFAULT 'user',
  payer_id UUID NOT NULL,
  current_plan_id UUID REFERENCES public.agent_plans(id) ON DELETE SET NULL,
  monthly_spend_limit NUMERIC,
  auto_pause_over_limit BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- agent_usage_records
CREATE TABLE IF NOT EXISTS public.agent_usage_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  payer_type public.billing_entity_type NOT NULL DEFAULT 'user',
  payer_id UUID NOT NULL,
  action_type_id UUID NOT NULL REFERENCES public.monetized_action_types(id),
  resource_type TEXT,
  resource_id UUID,
  sensitivity public.content_sensitivity NOT NULL DEFAULT 'public',
  trust_score_at_action INTEGER NOT NULL DEFAULT 50,
  value_factor NUMERIC NOT NULL DEFAULT 1.0,
  base_price NUMERIC NOT NULL DEFAULT 0,
  trust_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  sensitivity_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  value_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  volume_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  final_price NUMERIC NOT NULL DEFAULT 0,
  billed_from_plan BOOLEAN NOT NULL DEFAULT false,
  creator_type public.billing_entity_type NOT NULL DEFAULT 'user',
  creator_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- revenue_share_records
CREATE TABLE IF NOT EXISTS public.revenue_share_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usage_record_id UUID NOT NULL REFERENCES public.agent_usage_records(id) ON DELETE CASCADE,
  beneficiary_type public.billing_entity_type NOT NULL,
  beneficiary_id UUID,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns to guilds, companies, territories
ALTER TABLE public.guilds
  ADD COLUMN IF NOT EXISTS value_factor NUMERIC NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS allow_agent_crawling BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_agent_subscription BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS value_factor NUMERIC NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS allow_agent_crawling BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_agent_subscription BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.territories
  ADD COLUMN IF NOT EXISTS value_factor NUMERIC NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS allow_agent_crawling BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_agent_subscription BOOLEAN NOT NULL DEFAULT false;

-- RLS
ALTER TABLE public.monetized_action_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_share_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_action_types" ON public.monetized_action_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_plans" ON public.agent_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_billing" ON public.agent_billing_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_usage" ON public.agent_usage_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_revenue" ON public.revenue_share_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_manage_action_types" ON public.monetized_action_types FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_manage_plans" ON public.agent_plans FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "owner_admin_billing" ON public.agent_billing_profiles FOR ALL TO authenticated
  USING (payer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (payer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "insert_usage" ON public.agent_usage_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "insert_revenue" ON public.revenue_share_records FOR INSERT TO authenticated WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_usage_records;
