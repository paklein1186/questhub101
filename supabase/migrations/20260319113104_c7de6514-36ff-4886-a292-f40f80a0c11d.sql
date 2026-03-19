
CREATE OR REPLACE FUNCTION public.spend_user_coins(
  _amount integer,
  _type text,
  _source text DEFAULT NULL,
  _related_entity_type text DEFAULT NULL,
  _related_entity_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _balance numeric;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT coins_balance INTO _balance FROM public.profiles WHERE id = _user_id;
  IF _balance IS NULL OR _balance < _amount THEN
    RAISE EXCEPTION 'Insufficient coins balance';
  END IF;

  UPDATE public.profiles SET coins_balance = coins_balance - _amount WHERE id = _user_id;

  INSERT INTO public.coin_transactions (user_id, amount, type, source, related_entity_type, related_entity_id)
  VALUES (_user_id, -_amount, _type, _source, _related_entity_type, _related_entity_id);
END;
$$;
