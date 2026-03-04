
-- Tighten the insert policy: only authenticated users or service role can insert for the target user
DROP POLICY "Service can insert triggers" ON public.pi_triggers;
CREATE POLICY "Insert own triggers"
  ON public.pi_triggers FOR INSERT
  WITH CHECK (auth.uid() = user_id);
