DROP POLICY IF EXISTS "Users can create services" ON public.services;

CREATE POLICY "Users can create services"
  ON public.services FOR INSERT
  WITH CHECK (
    (owner_type = 'USER' AND auth.uid() = provider_user_id)
    OR
    (owner_type = 'GUILD' AND owner_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.guild_members
      WHERE guild_members.guild_id = owner_id::uuid
        AND guild_members.user_id = auth.uid()
        AND guild_members.role = 'ADMIN'
    ))
    OR
    (owner_type = 'COMPANY' AND owner_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = owner_id::uuid
        AND company_members.user_id = auth.uid()
        AND company_members.role IN ('admin', 'owner')
    ))
  );
