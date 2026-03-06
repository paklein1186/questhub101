
-- Convert any existing PURCHASE rows to REWARD before enum change
UPDATE public.xp_transactions SET type = 'REWARD' WHERE type = 'PURCHASE';

-- Remove PURCHASE from enum
ALTER TYPE public.xp_transaction_type RENAME TO xp_transaction_type_old;
CREATE TYPE public.xp_transaction_type AS ENUM ('ACTION_SPEND', 'REWARD', 'ADJUSTMENT', 'REFUND');
ALTER TABLE public.xp_transactions
  ALTER COLUMN type TYPE public.xp_transaction_type
  USING type::text::public.xp_transaction_type;
DROP TYPE public.xp_transaction_type_old;

-- Add xp_total on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp_total INTEGER NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.profiles.xp_total IS 'Reputation score — earned only through contributions, never purchases';

-- Backfill
UPDATE public.profiles p SET xp_total = COALESCE((
  SELECT SUM(amount_xp) FROM public.xp_transactions x WHERE x.user_id = p.user_id
), 0);

-- Trigger
CREATE OR REPLACE FUNCTION public.sync_xp_total_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET xp_total = COALESCE(xp_total, 0) + NEW.amount_xp
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_xp_total
  AFTER INSERT ON public.xp_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_xp_total_on_insert();

-- RPC get_user_ctg_summary
CREATE OR REPLACE FUNCTION public.get_user_ctg_summary(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_profile RECORD;
  v_txns jsonb;
BEGIN
  SELECT balance, lifetime_earned, lifetime_spent INTO v_wallet
  FROM ctg_wallets WHERE user_id = p_user_id;

  SELECT credits_balance, xp_total INTO v_profile
  FROM profiles WHERE user_id = p_user_id;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb) INTO v_txns
  FROM (
    SELECT id, amount, type, note, balance_after, created_at
    FROM ctg_transactions WHERE user_id = p_user_id
    ORDER BY created_at DESC LIMIT 5
  ) t;

  RETURN jsonb_build_object(
    'ctg_balance', COALESCE(v_wallet.balance, 0),
    'lifetime_earned', COALESCE(v_wallet.lifetime_earned, 0),
    'lifetime_spent', COALESCE(v_wallet.lifetime_spent, 0),
    'credits_balance', COALESCE(v_profile.credits_balance, 0),
    'xp_total', COALESCE(v_profile.xp_total, 0),
    'recent_transactions', v_txns
  );
END;
$$;
