
-- Fix overly permissive policy on calendar_busy_events
-- Drop the catch-all policy and replace with service-role-only insert/update/delete
DROP POLICY "Service role can manage busy events" ON public.calendar_busy_events;

-- Only authenticated users can see their own busy events (already exists)
-- For edge function writes, we use service_role key which bypasses RLS
