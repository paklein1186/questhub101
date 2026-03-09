
-- Drop broken policies that block all writes
DROP POLICY IF EXISTS "ctg_wallets_insert_service" ON ctg_wallets;
DROP POLICY IF EXISTS "ctg_wallets_update_service" ON ctg_wallets;
DROP POLICY IF EXISTS "ctg_transactions_insert_service" ON ctg_transactions;
DROP POLICY IF EXISTS "ctg_commons_wallet_update_service" ON ctg_commons_wallet;

-- Recreate with proper conditions allowing authenticated + service role
CREATE POLICY "ctg_wallets_insert_auth" ON ctg_wallets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ctg_wallets_update_auth" ON ctg_wallets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ctg_transactions_insert_auth" ON ctg_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ctg_commons_wallet_update_auth" ON ctg_commons_wallet FOR UPDATE TO authenticated USING (true);

-- Also allow service_role explicitly
CREATE POLICY "ctg_wallets_insert_service" ON ctg_wallets FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "ctg_wallets_update_service" ON ctg_wallets FOR UPDATE TO service_role USING (true);
CREATE POLICY "ctg_transactions_insert_service" ON ctg_transactions FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "ctg_commons_wallet_update_service" ON ctg_commons_wallet FOR UPDATE TO service_role USING (true);
CREATE POLICY "ctg_commons_wallet_insert_service" ON ctg_commons_wallet FOR INSERT TO service_role WITH CHECK (true);
