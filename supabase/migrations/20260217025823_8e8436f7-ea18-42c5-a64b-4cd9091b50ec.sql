-- Trigger to create a notification when credits are received (purchases, gifts, rewards)
CREATE OR REPLACE FUNCTION public.notify_credits_received()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Only notify for positive credit amounts (received, not spent)
  IF NEW.amount <= 0 THEN
    RETURN NEW;
  END IF;

  -- Skip initial grants (handled by onboarding)
  IF NEW.type = 'INITIAL_GRANT' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, deep_link_url, data)
  VALUES (
    NEW.user_id,
    'CREDIT_RECEIVED',
    CASE
      WHEN NEW.type IN ('PURCHASE', 'purchase', 'TOP_UP_PURCHASE') THEN 'Credits purchased'
      WHEN NEW.type = 'GIFT_RECEIVED' THEN 'Credits received'
      WHEN NEW.type IN ('QUEST_REWARD', 'QUEST_REWARD_EARNED') THEN 'Quest reward earned'
      WHEN NEW.type = 'ACHIEVEMENT_REWARD' THEN 'Achievement reward'
      WHEN NEW.type = 'MILESTONE_REWARD' THEN 'Milestone reward'
      WHEN NEW.type = 'REFERRAL_BONUS' THEN 'Referral bonus'
      WHEN NEW.type = 'ADMIN_GRANT' THEN 'Credits granted'
      ELSE 'Credits received'
    END,
    'You received ' || NEW.amount || ' credits.' || COALESCE(' ' || NEW.source, ''),
    '/me?tab=wallet',
    jsonb_build_object('amount', NEW.amount, 'type', NEW.type, 'source', COALESCE(NEW.source, ''))
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_notify_credits_received
  AFTER INSERT ON public.credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_credits_received();