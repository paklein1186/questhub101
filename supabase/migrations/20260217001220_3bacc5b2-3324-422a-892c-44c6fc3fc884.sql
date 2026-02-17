
CREATE OR REPLACE FUNCTION public.spend_user_credits(_amount integer, _type text, _source text DEFAULT NULL::text, _related_entity_type text DEFAULT NULL::text, _related_entity_id text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _current_balance integer;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT COALESCE(credits_balance, 0) INTO _current_balance
  FROM profiles
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _current_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  INSERT INTO credit_transactions (user_id, type, amount, source, related_entity_type, related_entity_id)
  VALUES (_user_id, _type, -_amount, _source, _related_entity_type, _related_entity_id);

  UPDATE profiles
  SET credits_balance = _current_balance - _amount
  WHERE user_id = _user_id;
END;
$$;
