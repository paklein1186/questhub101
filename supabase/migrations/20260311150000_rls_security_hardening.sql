-- ============================================================================
-- RLS SECURITY HARDENING MIGRATION
-- Date: 2026-03-11
-- Fixes: 3 critical vulnerabilities identified during RLS audit
-- ============================================================================

-- ============================================================================
-- CRITICAL FIX #1: CTG Wallets & Transactions
-- Problem: Any authenticated user can INSERT/UPDATE any wallet and create
--          transactions for other users. Direct financial loss possible.
-- ============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "ctg_wallets_insert_auth" ON public.ctg_wallets;
DROP POLICY IF EXISTS "ctg_wallets_update_auth" ON public.ctg_wallets;
DROP POLICY IF EXISTS "ctg_transactions_insert_auth" ON public.ctg_transactions;
DROP POLICY IF EXISTS "ctg_commons_wallet_update_auth" ON public.ctg_commons_wallet;

-- Replace with user-scoped policies
CREATE POLICY "ctg_wallets_insert_own" ON public.ctg_wallets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ctg_wallets_update_own" ON public.ctg_wallets
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ctg_transactions_insert_own" ON public.ctg_transactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Commons wallet: only service_role can update (already has a service policy)
-- No authenticated INSERT/UPDATE policy needed — backend handles it
-- The existing "ctg_commons_wallet_update_service" with USING(false) blocks
-- authenticated users, which is correct. No replacement needed.


-- ============================================================================
-- CRITICAL FIX #2: Agent Usage & Revenue Records
-- Problem: Any authenticated user can insert fake usage/revenue records
--          and read all other users' billing data. Revenue fraud possible.
-- ============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "insert_usage" ON public.agent_usage_records;
DROP POLICY IF EXISTS "insert_revenue" ON public.revenue_share_records;
DROP POLICY IF EXISTS "auth_read_usage" ON public.agent_usage_records;
DROP POLICY IF EXISTS "auth_read_revenue" ON public.revenue_share_records;

-- Replace: only the payer can see their own usage records
CREATE POLICY "users_read_own_usage" ON public.agent_usage_records
  FOR SELECT TO authenticated
  USING (payer_id = auth.uid());

-- Replace: only service_role can insert usage records (backend billing)
-- No authenticated INSERT policy — usage recording happens server-side.

-- Replace: beneficiaries can see their own revenue shares
CREATE POLICY "users_read_own_revenue" ON public.revenue_share_records
  FOR SELECT TO authenticated
  USING (beneficiary_id = auth.uid());

-- No authenticated INSERT policy for revenue — backend handles distribution.

-- Admin override: allow admins to read all records for auditing
CREATE POLICY "admins_read_all_usage" ON public.agent_usage_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "admins_read_all_revenue" ON public.revenue_share_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );


-- ============================================================================
-- CRITICAL FIX #3: Natural System Data Points & Indicators
-- Problem: Any authenticated user can insert/update any ecosystem data.
--          Data integrity compromised.
-- ============================================================================

-- Drop overly permissive INSERT/UPDATE policies
DROP POLICY IF EXISTS "Authenticated users can insert data points" ON public.natural_system_data_points;
DROP POLICY IF EXISTS "Authenticated users can update indicators" ON public.natural_system_indicators;

-- The second policy on natural_system_indicators also named "Authenticated users can insert data points"
-- Supabase policy names must be unique per table, so this is the INSERT on indicators
DROP POLICY IF EXISTS "Authenticated users can insert data points" ON public.natural_system_indicators;

-- Replace: only admins can modify ecosystem data (for now).
-- TODO: When stewardship model is finalized, add territory steward access.
-- This is safer than allowing any authenticated user to corrupt environmental data.

CREATE POLICY "admins_insert_data_points" ON public.natural_system_data_points
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "admins_insert_indicators" ON public.natural_system_indicators
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "admins_update_indicators" ON public.natural_system_indicators
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- READ policies remain public (authenticated users can view ecosystem data)
-- The existing "Authenticated users can read data points" and
-- "Authenticated users can read indicators" SELECT policies are kept as-is.


-- ============================================================================
-- HIGH-RISK FIX: Guild & Quest topic/territory management
-- Problem: Policies named "Guild creators can manage" but use (true),
--          allowing ANY user to modify any guild's topics/territories.
-- ============================================================================

-- Guild topics
DROP POLICY IF EXISTS "Guild creators can manage topics" ON public.guild_topics;
DROP POLICY IF EXISTS "Guild creators can delete topics" ON public.guild_topics;

CREATE POLICY "guild_members_manage_topics" ON public.guild_topics
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guild_members
      WHERE guild_id = guild_topics.guild_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'creator')
    )
  );

CREATE POLICY "guild_members_delete_topics" ON public.guild_topics
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_members
      WHERE guild_id = guild_topics.guild_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'creator')
    )
  );

-- Guild territories
DROP POLICY IF EXISTS "Guild creators can manage territories" ON public.guild_territories;
DROP POLICY IF EXISTS "Guild creators can delete territories" ON public.guild_territories;

CREATE POLICY "guild_members_manage_territories" ON public.guild_territories
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guild_members
      WHERE guild_id = guild_territories.guild_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'creator')
    )
  );

CREATE POLICY "guild_members_delete_territories" ON public.guild_territories
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_members
      WHERE guild_id = guild_territories.guild_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'creator')
    )
  );
