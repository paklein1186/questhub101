-- Allow users to permanently delete their own messages
CREATE POLICY "dm_delete"
ON public.direct_messages
FOR DELETE
USING (auth.uid() = sender_id);