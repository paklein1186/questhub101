
-- agent usage records: server-written only
DROP POLICY IF EXISTS "insert_usage" ON public.agent_usage_records;

-- revenue shares & token flows: server-written only
DROP POLICY IF EXISTS "insert_revenue" ON public.revenue_share_records;
DROP POLICY IF EXISTS "Territory token flows insertable" ON public.territory_token_flows;

-- CTG ledger & wallets: server-written only
DROP POLICY IF EXISTS "ctg_commons_wallet_update_auth" ON public.ctg_commons_wallet;
DROP POLICY IF EXISTS "ctg_transactions_insert_auth" ON public.ctg_transactions;
DROP POLICY IF EXISTS "ctg_wallets_insert_auth" ON public.ctg_wallets;
DROP POLICY IF EXISTS "ctg_wallets_update_auth" ON public.ctg_wallets;

-- companies: creator must be the caller
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
CREATE POLICY "Users create companies they own" ON public.companies
  FOR INSERT TO authenticated WITH CHECK (contact_user_id = auth.uid());

-- territories
DROP POLICY IF EXISTS "Authenticated users can create territories" ON public.territories;
CREATE POLICY "Users create territories as themselves" ON public.territories
  FOR INSERT TO authenticated WITH CHECK (created_by_user_id = auth.uid());

-- territory chat logs
DROP POLICY IF EXISTS "Authenticated users can insert chat logs" ON public.territory_chat_logs;
CREATE POLICY "Users insert their own chat logs" ON public.territory_chat_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- territory excerpts
DROP POLICY IF EXISTS "Authenticated users can create territory excerpts" ON public.territory_excerpts;
CREATE POLICY "Users create their own territory excerpts" ON public.territory_excerpts
  FOR INSERT TO authenticated WITH CHECK (created_by_user_id = auth.uid());

-- natural systems
DROP POLICY IF EXISTS "Authenticated users can insert natural_systems" ON public.natural_systems;
DROP POLICY IF EXISTS "Authenticated users can update natural_systems" ON public.natural_systems;
CREATE POLICY "Users create their own natural systems" ON public.natural_systems
  FOR INSERT TO authenticated WITH CHECK (created_by_user_id = auth.uid());
CREATE POLICY "Creators or admins update natural systems" ON public.natural_systems
  FOR UPDATE TO authenticated
  USING (created_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- natural system data points / indicators: creator of the parent system or admin
DROP POLICY IF EXISTS "Authenticated users can insert data points" ON public.natural_system_data_points;
CREATE POLICY "System owners insert data points" ON public.natural_system_data_points
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.natural_systems ns
      WHERE ns.id = natural_system_id AND ns.created_by_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can upsert indicators" ON public.natural_system_indicators;
DROP POLICY IF EXISTS "Authenticated users can update indicators" ON public.natural_system_indicators;
CREATE POLICY "System owners insert indicators" ON public.natural_system_indicators
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.natural_systems ns
      WHERE ns.id = natural_system_id AND ns.created_by_user_id = auth.uid()
    )
  );
CREATE POLICY "System owners update indicators" ON public.natural_system_indicators
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.natural_systems ns
      WHERE ns.id = natural_system_id AND ns.created_by_user_id = auth.uid()
    )
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.natural_systems ns
      WHERE ns.id = natural_system_id AND ns.created_by_user_id = auth.uid()
    )
  );

-- territory dataset matches: admins only (otherwise written by the server)
DROP POLICY IF EXISTS "Authenticated users can insert territory dataset matches" ON public.territory_dataset_matches;
DROP POLICY IF EXISTS "Authenticated users can update territory dataset matches" ON public.territory_dataset_matches;
CREATE POLICY "Admins insert territory dataset matches" ON public.territory_dataset_matches
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update territory dataset matches" ON public.territory_dataset_matches
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- quest proposals: for yourself, or for an entity you belong to
DROP POLICY IF EXISTS "Users can create proposals" ON public.quest_proposals;
CREATE POLICY "Users create proposals for themselves or their entities" ON public.quest_proposals
  FOR INSERT TO authenticated WITH CHECK (
    (upper(proposer_type) = 'USER' AND proposer_id = auth.uid()::text)
    OR (upper(proposer_type) = 'GUILD' AND EXISTS (
      SELECT 1 FROM public.guild_members gm WHERE gm.guild_id::text = proposer_id AND gm.user_id = auth.uid()))
    OR (upper(proposer_type) = 'COMPANY' AND EXISTS (
      SELECT 1 FROM public.company_members cm WHERE cm.company_id::text = proposer_id AND cm.user_id = auth.uid()))
    OR (upper(proposer_type) = 'POD' AND EXISTS (
      SELECT 1 FROM public.pod_members pm WHERE pm.pod_id::text = proposer_id AND pm.user_id = auth.uid()))
  );
