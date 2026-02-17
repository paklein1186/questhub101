
-- Auto-follow territory when a user_territories association is created
CREATE OR REPLACE FUNCTION public.auto_follow_territory_on_association()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.follows (follower_id, target_type, target_id)
  VALUES (NEW.user_id, 'TERRITORY', NEW.territory_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_auto_follow_territory_on_association
AFTER INSERT ON public.user_territories
FOR EACH ROW
EXECUTE FUNCTION public.auto_follow_territory_on_association();
