
-- 1. Commission Rules table
CREATE TABLE public.commission_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_amount integer NOT NULL DEFAULT 0,
  max_amount integer DEFAULT NULL,
  commission_percentage numeric(5,2) NOT NULL,
  description text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;

-- Everyone can read commission rules (public pricing info)
CREATE POLICY "Commission rules are viewable by everyone"
  ON public.commission_rules FOR SELECT USING (true);

-- Only admins can modify (via service role / edge functions)

-- Insert default degressive tiers
INSERT INTO public.commission_rules (min_amount, max_amount, commission_percentage, description, sort_order) VALUES
  (0, 500, 10.00, 'Small missions (€0–€500)', 1),
  (500, 2000, 7.00, 'Medium missions (€500–€2,000)', 2),
  (2000, 10000, 5.00, 'Large missions (€2,000–€10,000)', 3),
  (10000, NULL, 3.00, 'Enterprise missions (€10,000+)', 4);

-- 2. Add commission_discount_percentage to subscription_plans
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS commission_discount_percentage numeric(5,2) NOT NULL DEFAULT 0;

UPDATE public.subscription_plans SET commission_discount_percentage = 0 WHERE code = 'FREE';
UPDATE public.subscription_plans SET commission_discount_percentage = 20 WHERE code = 'CREATOR';
UPDATE public.subscription_plans SET commission_discount_percentage = 40 WHERE code = 'CATALYST';

-- 3. Mission Agreements table
CREATE TABLE public.mission_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id UUID NOT NULL REFERENCES public.quests(id),
  owner_user_id UUID NOT NULL,
  collaborator_user_id UUID NOT NULL,
  proposal_id UUID REFERENCES public.quest_proposals(id),
  amount_accepted numeric NOT NULL,
  base_commission_percentage numeric(5,2) NOT NULL,
  plan_discount_percentage numeric(5,2) NOT NULL DEFAULT 0,
  credit_reduction_percentage numeric(5,2) NOT NULL DEFAULT 0,
  final_commission_percentage numeric(5,2) NOT NULL,
  commission_amount numeric NOT NULL,
  payout_amount numeric NOT NULL,
  credits_spent_for_reduction integer NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'PENDING',
  payment_type text NOT NULL DEFAULT 'INVOICE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mission_agreements ENABLE ROW LEVEL SECURITY;

-- Parties can see their own agreements
CREATE POLICY "Users can view their own agreements"
  ON public.mission_agreements FOR SELECT
  USING (auth.uid() = owner_user_id OR auth.uid() = collaborator_user_id);

CREATE POLICY "Quest owners can create agreements"
  ON public.mission_agreements FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Parties can update their agreements"
  ON public.mission_agreements FOR UPDATE
  USING (auth.uid() = owner_user_id OR auth.uid() = collaborator_user_id);

-- Trigger for updated_at
CREATE TRIGGER update_commission_rules_updated_at
  BEFORE UPDATE ON public.commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mission_agreements_updated_at
  BEFORE UPDATE ON public.mission_agreements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Add global commission settings to a simple key-value config
-- We'll use commission_rules + plan discounts, no extra table needed.
-- The minimum floor (1%) is enforced in application code.
