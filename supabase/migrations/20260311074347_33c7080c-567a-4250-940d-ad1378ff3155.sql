
-- FIX 2 retry: guild_wallets - fix enum value
DROP POLICY IF EXISTS "Guild wallets updatable by system" ON public.guild_wallets;
DROP POLICY IF EXISTS "Guild wallets readable by members" ON public.guild_wallets;

CREATE POLICY "Guild wallets readable by guild members"
ON public.guild_wallets FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.guild_members gm
    WHERE gm.guild_id = guild_wallets.guild_id
    AND gm.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Guild wallets modifiable by service role only"
ON public.guild_wallets FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Guild wallets updatable by guild admins"
ON public.guild_wallets FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.guild_members gm
    WHERE gm.guild_id = guild_wallets.guild_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'ADMIN'
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);
