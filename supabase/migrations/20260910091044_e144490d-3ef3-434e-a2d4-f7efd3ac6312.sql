ALTER TABLE public.guilds
  ADD COLUMN IF NOT EXISTS entry_fee_max_credits integer,
  ADD COLUMN IF NOT EXISTS monthly_fee_max_credits integer;

ALTER TABLE public.user_guild_memberships
  ADD COLUMN IF NOT EXISTS chosen_fee_credits integer;