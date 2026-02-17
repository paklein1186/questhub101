-- Allow guild admins to update member roles
CREATE POLICY "Guild admins can update members"
ON public.guild_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.guild_members gm
    WHERE gm.guild_id = guild_members.guild_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.guild_members gm
    WHERE gm.guild_id = guild_members.guild_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'ADMIN'
  )
);

-- Also allow platform admins
CREATE POLICY "Platform admins can update guild members"
ON public.guild_members
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));