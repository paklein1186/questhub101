CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  free_plan_id UUID;
  user_role TEXT;
BEGIN
  -- Validate role against allowed values, default to GAMECHANGER
  user_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'GAMECHANGER');
  IF user_role NOT IN ('GAMECHANGER', 'ECOSYSTEM_BUILDER', 'BOTH') THEN
    user_role := 'GAMECHANGER';
  END IF;

  INSERT INTO public.profiles (user_id, email, name, role, credits_balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    user_role,
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