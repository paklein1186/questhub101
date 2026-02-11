
-- Update handle_new_user to give 200 initial credits and log a credit transaction
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  free_plan_id UUID;
BEGIN
  INSERT INTO public.profiles (user_id, email, name, role, credits_balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'GAMECHANGER'),
    200
  );

  -- Log initial credit grant
  INSERT INTO public.credit_transactions (user_id, type, amount, source)
  VALUES (NEW.id, 'INITIAL_GRANT', 200, 'Welcome bonus');

  SELECT id INTO free_plan_id FROM public.subscription_plans WHERE code = 'FREE' LIMIT 1;
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (user_id, plan_id, status, is_current)
    VALUES (NEW.id, free_plan_id, 'ACTIVE', true);
  END IF;

  RETURN NEW;
END;
$function$;

-- Add reward_currency column to quests if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'quests' AND column_name = 'reward_currency') THEN
    ALTER TABLE public.quests ADD COLUMN reward_currency TEXT NOT NULL DEFAULT 'CREDITS' CHECK (reward_currency IN ('CREDITS', 'MONEY', 'BOTH'));
  END IF;
END$$;
