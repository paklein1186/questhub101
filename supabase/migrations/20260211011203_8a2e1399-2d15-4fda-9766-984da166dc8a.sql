
-- Fix: Add WITH CHECK to bookings UPDATE policy
DROP POLICY "Booking parties can update" ON public.bookings;
CREATE POLICY "Booking parties can update"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = provider_user_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = provider_user_id);
