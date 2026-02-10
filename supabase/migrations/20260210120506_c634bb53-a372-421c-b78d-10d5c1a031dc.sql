
-- Fix overly permissive RLS policies from the migration

-- Referral UPDATE: restrict to owner or the user claiming it
DROP POLICY IF EXISTS "Referral usage can be updated" ON public.referrals;
CREATE POLICY "Referral usage can be updated"
  ON public.referrals FOR UPDATE
  USING (auth.uid() = owner_user_id OR auth.uid() = used_by_user_id);

-- Notifications INSERT: restrict to system (service_role) or self
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Users or system can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Achievements INSERT: restrict to the user themselves
DROP POLICY IF EXISTS "System can create achievements" ON public.achievements;
CREATE POLICY "Users can receive achievements"
  ON public.achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);
