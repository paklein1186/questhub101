
-- Tighten guild_topics INSERT: only guild creator or admin
DROP POLICY "Guild creators can manage topics" ON public.guild_topics;
CREATE POLICY "Guild creators can manage topics" ON public.guild_topics FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.guilds WHERE id = guild_id AND created_by_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY "Guild creators can delete topics" ON public.guild_topics;
CREATE POLICY "Guild creators can delete topics" ON public.guild_topics FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.guilds WHERE id = guild_id AND created_by_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Tighten guild_territories
DROP POLICY "Guild creators can manage territories" ON public.guild_territories;
CREATE POLICY "Guild creators can manage territories" ON public.guild_territories FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.guilds WHERE id = guild_id AND created_by_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY "Guild creators can delete territories" ON public.guild_territories;
CREATE POLICY "Guild creators can delete territories" ON public.guild_territories FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.guilds WHERE id = guild_id AND created_by_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Tighten quest_topics
DROP POLICY "Quest creators can manage topics" ON public.quest_topics;
CREATE POLICY "Quest creators can manage topics" ON public.quest_topics FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.quests WHERE id = quest_id AND created_by_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY "Quest creators can delete topics" ON public.quest_topics;
CREATE POLICY "Quest creators can delete topics" ON public.quest_topics FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.quests WHERE id = quest_id AND created_by_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Tighten quest_territories
DROP POLICY "Quest creators can manage territories" ON public.quest_territories;
CREATE POLICY "Quest creators can manage territories" ON public.quest_territories FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.quests WHERE id = quest_id AND created_by_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY "Quest creators can delete territories" ON public.quest_territories;
CREATE POLICY "Quest creators can delete territories" ON public.quest_territories FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.quests WHERE id = quest_id AND created_by_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
