
-- 1. Add give-back default columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_give_back_target_type text NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS default_give_back_guild_id uuid REFERENCES public.guilds(id) ON DELETE SET NULL;

-- 2. Create gratitude_donations table
CREATE TABLE public.gratitude_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id),
  to_target_type text NOT NULL,
  to_guild_id uuid REFERENCES public.guilds(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount_credits integer NOT NULL DEFAULT 0,
  amount_fiat numeric NOT NULL DEFAULT 0,
  currency text,
  metadata jsonb
);

-- Indexes
CREATE INDEX idx_gratitude_donations_from_user ON public.gratitude_donations(from_user_id);
CREATE INDEX idx_gratitude_donations_to_guild ON public.gratitude_donations(to_guild_id);
CREATE INDEX idx_gratitude_donations_booking ON public.gratitude_donations(booking_id);
CREATE INDEX idx_gratitude_donations_created ON public.gratitude_donations(created_at);

-- 3. RLS policies
ALTER TABLE public.gratitude_donations ENABLE ROW LEVEL SECURITY;

-- Users can read their own donations
CREATE POLICY "Users can read own donations"
  ON public.gratitude_donations FOR SELECT
  USING (auth.uid() = from_user_id);

-- Guild admins can read donations to their guild
CREATE POLICY "Guild admins read guild donations"
  ON public.gratitude_donations FOR SELECT
  USING (
    to_target_type = 'GUILD'
    AND to_guild_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.guild_members gm
      WHERE gm.guild_id = to_guild_id AND gm.user_id = auth.uid() AND gm.role = 'ADMIN'
    )
  );

-- Platform admins can read all donations
CREATE POLICY "Admins read all donations"
  ON public.gratitude_donations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert their own donations
CREATE POLICY "Users can insert own donations"
  ON public.gratitude_donations FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- 4. RPC for secure give-back
CREATE OR REPLACE FUNCTION public.process_give_back(
  _to_target_type text,
  _to_guild_id uuid DEFAULT NULL,
  _amount_credits integer DEFAULT 0,
  _booking_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _current_balance integer;
  _donation_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _amount_credits < 1 THEN
    RAISE EXCEPTION 'Amount must be at least 1';
  END IF;

  IF _to_target_type NOT IN ('GUILD', 'PLATFORM') THEN
    RAISE EXCEPTION 'Invalid target type';
  END IF;

  IF _to_target_type = 'GUILD' AND _to_guild_id IS NULL THEN
    RAISE EXCEPTION 'Guild ID required for guild give-back';
  END IF;

  -- Check balance
  SELECT COALESCE(credits_balance, 0) INTO _current_balance
  FROM profiles WHERE user_id = _user_id FOR UPDATE;

  IF _current_balance < _amount_credits THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Deduct from user
  UPDATE profiles SET credits_balance = credits_balance - _amount_credits WHERE user_id = _user_id;

  INSERT INTO credit_transactions (user_id, type, amount, source, related_entity_type, related_entity_id)
  VALUES (_user_id, 'GIVE_BACK', -_amount_credits, 'Give-back contribution',
    CASE WHEN _to_target_type = 'GUILD' THEN 'guild' ELSE 'platform' END,
    CASE WHEN _to_target_type = 'GUILD' THEN _to_guild_id::text ELSE 'platform' END);

  -- Credit recipient
  IF _to_target_type = 'GUILD' THEN
    UPDATE guilds SET credits_balance = credits_balance + _amount_credits WHERE id = _to_guild_id;
    INSERT INTO unit_credit_transactions (unit_type, unit_id, amount, type, note, created_by_user_id)
    VALUES ('GUILD', _to_guild_id, _amount_credits, 'GIVE_BACK_RECEIVED', 'Give-back from member', _user_id);
  ELSE
    -- Credit treasury
    UPDATE cooperative_settings
    SET value = to_jsonb((COALESCE((value)::integer, 0) + _amount_credits)), updated_at = now()
    WHERE key = 'treasury_balance';
  END IF;

  -- Insert donation record
  INSERT INTO gratitude_donations (from_user_id, to_target_type, to_guild_id, booking_id, amount_credits, metadata)
  VALUES (_user_id, _to_target_type, _to_guild_id, _booking_id, _amount_credits, _metadata)
  RETURNING id INTO _donation_id;

  -- Award small XP bonus
  PERFORM grant_user_xp(_user_id, 'GIVE_BACK', 2, NULL, NULL, 'donation', _donation_id::text);

  RETURN _donation_id;
END;
$$;
