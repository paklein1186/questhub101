
-- Rename columns in profiles
ALTER TABLE public.profiles RENAME COLUMN gameb_tokens_balance TO coins_balance;

-- Rename columns in quests
ALTER TABLE public.quests RENAME COLUMN gameb_token_budget TO coin_budget;
ALTER TABLE public.quests RENAME COLUMN gameb_token_escrow TO coin_escrow;
ALTER TABLE public.quests RENAME COLUMN gameb_token_escrow_status TO coin_escrow_status;

-- Rename columns in quest_subtasks
ALTER TABLE public.quest_subtasks RENAME COLUMN gameb_weight TO contribution_weight;

-- Rename column in quest_value_pie_log (correct table name)
ALTER TABLE public.quest_value_pie_log RENAME COLUMN gameb_tokens_awarded TO coins_awarded;

-- Rename columns in guild_wallets
ALTER TABLE public.guild_wallets RENAME COLUMN gameb_balance TO coins_balance;

-- Rename columns in territories
ALTER TABLE public.territories RENAME COLUMN gameb_balance TO coins_balance;

-- Rename columns in companies
ALTER TABLE public.companies RENAME COLUMN gameb_tokens_balance TO coins_balance;

-- Rename columns in guilds
ALTER TABLE public.guilds RENAME COLUMN gameb_tokens_balance TO coins_balance;

-- Rename table gameb_token_transactions → coin_transactions
ALTER TABLE public.gameb_token_transactions RENAME TO coin_transactions;

-- Rename table gameb_withdrawal_requests → coin_withdrawal_requests
ALTER TABLE public.gameb_withdrawal_requests RENAME TO coin_withdrawal_requests;
