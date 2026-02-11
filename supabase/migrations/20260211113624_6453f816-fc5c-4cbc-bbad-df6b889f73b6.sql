
-- Shareholdings table for cooperative membership
CREATE TABLE public.shareholdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  share_class TEXT NOT NULL CHECK (share_class IN ('A', 'B')),
  number_of_shares INTEGER NOT NULL DEFAULT 1,
  purchase_price_per_share NUMERIC(10,2) NOT NULL DEFAULT 10.00,
  total_paid NUMERIC(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shareholdings ENABLE ROW LEVEL SECURITY;

-- Users can view their own shareholdings
CREATE POLICY "Users can view own shareholdings"
ON public.shareholdings FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own shareholdings (via edge function)
CREATE POLICY "Users can insert own shareholdings"
ON public.shareholdings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all shareholdings
CREATE POLICY "Admins can view all shareholdings"
ON public.shareholdings FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'superadmin'))
);

-- Cooperative settings table (admin-managed)
CREATE TABLE public.cooperative_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cooperative_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read cooperative settings
CREATE POLICY "Anyone can read cooperative settings"
ON public.cooperative_settings FOR SELECT
USING (true);

-- Only admins can update
CREATE POLICY "Admins can manage cooperative settings"
ON public.cooperative_settings FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'superadmin'))
);

-- Insert default settings
INSERT INTO public.cooperative_settings (key, value) VALUES
  ('share_price', '{"amount": 10, "currency": "EUR"}'),
  ('class_a_enabled', '{"enabled": true}'),
  ('class_b_enabled', '{"enabled": true}'),
  ('weight_formula_a', '{"formula": "log(1 + n)"}'),
  ('weight_formula_b', '{"formula": "log(1 + n) * 0.2"}');

-- Add governance fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_shares_a INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_shares_b INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS governance_weight NUMERIC(10,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_cooperative_member BOOLEAN NOT NULL DEFAULT false;

-- Function to recalculate governance weight after share purchase
CREATE OR REPLACE FUNCTION public.recalculate_governance_weight()
RETURNS TRIGGER AS $$
DECLARE
  shares_a INTEGER;
  shares_b INTEGER;
  weight NUMERIC;
BEGIN
  SELECT COALESCE(SUM(number_of_shares) FILTER (WHERE share_class = 'A'), 0),
         COALESCE(SUM(number_of_shares) FILTER (WHERE share_class = 'B'), 0)
  INTO shares_a, shares_b
  FROM public.shareholdings
  WHERE user_id = NEW.user_id;

  weight := ln(1.0 + shares_a) + ln(1.0 + shares_b) * 0.2;

  UPDATE public.profiles
  SET total_shares_a = shares_a,
      total_shares_b = shares_b,
      governance_weight = weight,
      is_cooperative_member = (shares_a + shares_b) > 0
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_recalculate_governance_weight
AFTER INSERT ON public.shareholdings
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_governance_weight();
