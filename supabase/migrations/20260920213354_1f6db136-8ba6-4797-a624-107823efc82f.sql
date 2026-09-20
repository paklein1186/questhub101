
DROP POLICY IF EXISTS "Authenticated users can create unit chat threads" ON public.unit_chat_threads;
CREATE POLICY "Members create unit chat threads" ON public.unit_chat_threads
  FOR INSERT TO authenticated WITH CHECK (
    CASE entity_type
      WHEN 'GUILD' THEN EXISTS (SELECT 1 FROM public.guild_members m WHERE m.guild_id = entity_id AND m.user_id = auth.uid())
      WHEN 'POD' THEN EXISTS (SELECT 1 FROM public.pod_members m WHERE m.pod_id = entity_id AND m.user_id = auth.uid())
      WHEN 'COMPANY' THEN EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id = entity_id AND m.user_id = auth.uid())
      WHEN 'QUEST' THEN EXISTS (SELECT 1 FROM public.quest_participants p WHERE p.quest_id = entity_id AND p.user_id = auth.uid())
                       OR EXISTS (SELECT 1 FROM public.quests q WHERE q.id = entity_id AND q.created_by_user_id = auth.uid())
      ELSE false
    END
  );
