CREATE POLICY "Users can join or admins can add members"
ON public.guild_members FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.guild_members gm
    WHERE gm.guild_id = guild_members.guild_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'ADMIN'
  )
);