-- 1. Guild wallets get a credits balance
ALTER TABLE public.guild_wallets ADD COLUMN IF NOT EXISTS credits_balance numeric NOT NULL DEFAULT 0;

-- 2. Guild credit ledger
CREATE TABLE IF NOT EXISTS public.guild_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id uuid,
  amount numeric NOT NULL,
  type text NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.guild_credit_transactions TO authenticated;
GRANT ALL ON public.guild_credit_transactions TO service_role;

ALTER TABLE public.guild_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guild admins can view guild credit transactions"
ON public.guild_credit_transactions FOR SELECT TO authenticated
USING (
  public.is_guild_admin(guild_id, auth.uid())
  OR user_id = auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_guild_credit_tx_guild ON public.guild_credit_transactions(guild_id, created_at DESC);

-- 3. Guild billing configuration
ALTER TABLE public.guilds
  ADD COLUMN IF NOT EXISTS billing_model text NOT NULL DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS monthly_fee_credits integer,
  ADD COLUMN IF NOT EXISTS joining_fee_credits integer,
  ADD COLUMN IF NOT EXISTS requires_application_before_payment boolean NOT NULL DEFAULT false;

-- 4. Membership lifecycle
ALTER TABLE public.user_guild_memberships
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_payment_at timestamptz;

UPDATE public.user_guild_memberships
SET current_period_end = membership_expires_at
WHERE current_period_end IS NULL AND membership_expires_at IS NOT NULL;

-- 5. Guild creators are permanent members
CREATE OR REPLACE FUNCTION public.ensure_guild_creator_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by_user_id IS NOT NULL THEN
    INSERT INTO public.user_guild_memberships (user_id, guild_id, role, status, membership_expires_at, current_period_end)
    VALUES (NEW.created_by_user_id, NEW.id, 'member', 'active', NULL, NULL)
    ON CONFLICT (user_id, guild_id) DO UPDATE
      SET role = 'member', status = 'active', membership_expires_at = NULL, current_period_end = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guild_creator_membership ON public.guilds;
CREATE TRIGGER trg_guild_creator_membership
AFTER INSERT ON public.guilds
FOR EACH ROW EXECUTE FUNCTION public.ensure_guild_creator_membership();

-- backfill existing creators
INSERT INTO public.user_guild_memberships (user_id, guild_id, role, status, membership_expires_at, current_period_end)
SELECT g.created_by_user_id, g.id, 'member', 'active', NULL, NULL
FROM public.guilds g
WHERE g.created_by_user_id IS NOT NULL
ON CONFLICT (user_id, guild_id) DO UPDATE
  SET role = 'member', status = 'active', membership_expires_at = NULL, current_period_end = NULL;