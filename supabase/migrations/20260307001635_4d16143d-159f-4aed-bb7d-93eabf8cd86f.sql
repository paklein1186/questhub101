
CREATE OR REPLACE FUNCTION public.notify_ctg_earned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only for earned types with positive amounts
  IF NEW.type LIKE 'EARNED_%' AND NEW.amount > 0 THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      body,
      deep_link,
      created_at
    ) VALUES (
      NEW.user_id,
      'CTG_EARNED',
      '🌱 +' || ROUND(NEW.amount::numeric, 2) || ' $CTG gagnés !',
      'Pour : ' || COALESCE(NEW.note, 'Contribution'),
      '/me?tab=wallet',
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ctg_earned_notification ON public.ctg_transactions;
CREATE TRIGGER trg_ctg_earned_notification
  AFTER INSERT ON public.ctg_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ctg_earned();
