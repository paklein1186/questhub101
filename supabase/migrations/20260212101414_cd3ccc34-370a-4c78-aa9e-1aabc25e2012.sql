-- Allow authenticated users to create notifications (needed for invite/mention notifications)
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);