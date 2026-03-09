
CREATE OR REPLACE FUNCTION public.sync_ctg_balance_to_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE profiles SET ctg_balance = NEW.balance WHERE user_id = NEW.user_id;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_sync_ctg_balance
AFTER INSERT OR UPDATE OF balance ON public.ctg_wallets
FOR EACH ROW EXECUTE FUNCTION public.sync_ctg_balance_to_profile();
