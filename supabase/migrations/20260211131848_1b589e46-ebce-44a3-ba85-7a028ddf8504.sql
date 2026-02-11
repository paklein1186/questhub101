
-- Fix SELECT policy to also show drafts to guild/company admins
DROP POLICY IF EXISTS "Published services are viewable by everyone" ON public.services;
CREATE POLICY "Published services are viewable by everyone"
ON public.services FOR SELECT
USING (
  (is_deleted = false)
  AND (
    (is_draft = false)
    OR (provider_user_id = auth.uid())
    OR (
      owner_type = 'GUILD' AND owner_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM guild_members
        WHERE guild_members.guild_id = services.owner_id::uuid
          AND guild_members.user_id = auth.uid()
          AND guild_members.role = 'ADMIN'
      )
    )
    OR (
      owner_type = 'COMPANY' AND owner_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM company_members
        WHERE company_members.company_id = services.owner_id::uuid
          AND company_members.user_id = auth.uid()
          AND company_members.role IN ('admin', 'owner')
      )
    )
  )
);

-- Fix UPDATE policy to allow guild/company admins to update their services
DROP POLICY IF EXISTS "Providers can update their services" ON public.services;
CREATE POLICY "Providers can update their services"
ON public.services FOR UPDATE
USING (
  (auth.uid() = provider_user_id)
  OR has_role(auth.uid(), 'admin')
  OR (
    owner_type = 'GUILD' AND owner_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_members.guild_id = services.owner_id::uuid
        AND guild_members.user_id = auth.uid()
        AND guild_members.role = 'ADMIN'
    )
  )
  OR (
    owner_type = 'COMPANY' AND owner_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = services.owner_id::uuid
        AND company_members.user_id = auth.uid()
        AND company_members.role IN ('admin', 'owner')
    )
  )
);

-- Also add DELETE policy for guild/company admins
DROP POLICY IF EXISTS "Providers can delete their services" ON public.services;
CREATE POLICY "Providers can delete their services"
ON public.services FOR DELETE
USING (
  (auth.uid() = provider_user_id)
  OR has_role(auth.uid(), 'admin')
  OR (
    owner_type = 'GUILD' AND owner_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_members.guild_id = services.owner_id::uuid
        AND guild_members.user_id = auth.uid()
        AND guild_members.role = 'ADMIN'
    )
  )
  OR (
    owner_type = 'COMPANY' AND owner_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = services.owner_id::uuid
        AND company_members.user_id = auth.uid()
        AND company_members.role IN ('admin', 'owner')
    )
  )
);
