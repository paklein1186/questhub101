
-- Fix: Allow authenticated users to insert notifications for ANY user
-- This is necessary because mentions, bookings, follows etc. create notifications for other users
DROP POLICY IF EXISTS "Users or system can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);
