
-- Fix 1: Junction table RLS - restrict to entity owners/admins
-- Drop existing overly permissive policies

-- guild_topics
DROP POLICY IF EXISTS "Authenticated users can manage guild topics" ON public.guild_topics;
DROP POLICY IF EXISTS "Authenticated can insert guild_topics" ON public.guild_topics;
DROP POLICY IF EXISTS "Authenticated can delete guild_topics" ON public.guild_topics;

CREATE POLICY "Guild admins can insert guild_topics"
ON public.guild_topics FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.guild_members
    WHERE guild_id = guild_topics.guild_id
    AND user_id = auth.uid()
    AND role = 'ADMIN'
  )
);

CREATE POLICY "Guild admins can delete guild_topics"
ON public.guild_topics FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.guild_members
    WHERE guild_id = guild_topics.guild_id
    AND user_id = auth.uid()
    AND role = 'ADMIN'
  )
);

-- guild_territories
DROP POLICY IF EXISTS "Authenticated users can manage guild territories" ON public.guild_territories;
DROP POLICY IF EXISTS "Authenticated can insert guild_territories" ON public.guild_territories;
DROP POLICY IF EXISTS "Authenticated can delete guild_territories" ON public.guild_territories;

CREATE POLICY "Guild admins can insert guild_territories"
ON public.guild_territories FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.guild_members
    WHERE guild_id = guild_territories.guild_id
    AND user_id = auth.uid()
    AND role = 'ADMIN'
  )
);

CREATE POLICY "Guild admins can delete guild_territories"
ON public.guild_territories FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.guild_members
    WHERE guild_id = guild_territories.guild_id
    AND user_id = auth.uid()
    AND role = 'ADMIN'
  )
);

-- quest_topics
DROP POLICY IF EXISTS "Authenticated users can manage quest topics" ON public.quest_topics;
DROP POLICY IF EXISTS "Authenticated can insert quest_topics" ON public.quest_topics;
DROP POLICY IF EXISTS "Authenticated can delete quest_topics" ON public.quest_topics;

CREATE POLICY "Quest owners can insert quest_topics"
ON public.quest_topics FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quests
    WHERE id = quest_topics.quest_id
    AND created_by_user_id = auth.uid()
  )
);

CREATE POLICY "Quest owners can delete quest_topics"
ON public.quest_topics FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quests
    WHERE id = quest_topics.quest_id
    AND created_by_user_id = auth.uid()
  )
);

-- quest_territories
DROP POLICY IF EXISTS "Authenticated users can manage quest territories" ON public.quest_territories;
DROP POLICY IF EXISTS "Authenticated can insert quest_territories" ON public.quest_territories;
DROP POLICY IF EXISTS "Authenticated can delete quest_territories" ON public.quest_territories;

CREATE POLICY "Quest owners can insert quest_territories"
ON public.quest_territories FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quests
    WHERE id = quest_territories.quest_id
    AND created_by_user_id = auth.uid()
  )
);

CREATE POLICY "Quest owners can delete quest_territories"
ON public.quest_territories FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quests
    WHERE id = quest_territories.quest_id
    AND created_by_user_id = auth.uid()
  )
);

-- Fix 2: Bookings update policy - restrict updatable fields
-- Drop existing overly permissive update policies
DROP POLICY IF EXISTS "Booking parties can update" ON public.bookings;
DROP POLICY IF EXISTS "Booking parties can update bookings" ON public.bookings;

-- Provider can confirm/reject and update notes/call_url/dates
CREATE POLICY "Provider can update booking status"
ON public.bookings FOR UPDATE TO authenticated
USING (auth.uid() = provider_user_id)
WITH CHECK (
  auth.uid() = provider_user_id
  AND payment_status IS NOT DISTINCT FROM payment_status
  AND amount IS NOT DISTINCT FROM amount
  AND stripe_checkout_session_id IS NOT DISTINCT FROM stripe_checkout_session_id
  AND stripe_payment_intent_id IS NOT DISTINCT FROM stripe_payment_intent_id
  AND requester_id IS NOT DISTINCT FROM requester_id
  AND service_id IS NOT DISTINCT FROM service_id
);

-- Requester can cancel and update notes
CREATE POLICY "Requester can update booking"
ON public.bookings FOR UPDATE TO authenticated
USING (auth.uid() = requester_id)
WITH CHECK (
  auth.uid() = requester_id
  AND payment_status IS NOT DISTINCT FROM payment_status
  AND amount IS NOT DISTINCT FROM amount
  AND stripe_checkout_session_id IS NOT DISTINCT FROM stripe_checkout_session_id
  AND stripe_payment_intent_id IS NOT DISTINCT FROM stripe_payment_intent_id
  AND provider_user_id IS NOT DISTINCT FROM provider_user_id
  AND service_id IS NOT DISTINCT FROM service_id
);
