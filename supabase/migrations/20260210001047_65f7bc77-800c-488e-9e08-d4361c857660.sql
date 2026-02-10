
-- Add stripe_price_id to subscription_plans
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Update with actual Stripe price IDs
UPDATE public.subscription_plans SET stripe_price_id = NULL WHERE code = 'FREE';
UPDATE public.subscription_plans SET stripe_price_id = 'price_1Sz4XDBttrYxqJqzRhFXd5vH', monthly_price_amount = 14.90 WHERE code = 'IMPACT_PLUS';
UPDATE public.subscription_plans SET stripe_price_id = 'price_1Sz4XEBttrYxqJqz4ZnzJPEV', monthly_price_amount = 39.00 WHERE code = 'ECOSYSTEM_PRO';
