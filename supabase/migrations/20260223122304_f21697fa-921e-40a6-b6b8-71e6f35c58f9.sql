-- Allow authenticated users to read any provider's busy events for slot calculation
CREATE POLICY "Authenticated users can view provider busy events for booking"
ON public.calendar_busy_events
FOR SELECT
TO authenticated
USING (true);
