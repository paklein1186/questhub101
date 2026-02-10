
-- ============================================
-- Unit Chat Threads (one per entity)
-- ============================================
CREATE TABLE public.unit_chat_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);

ALTER TABLE public.unit_chat_threads ENABLE ROW LEVEL SECURITY;

-- Members of the entity can view
CREATE POLICY "Members can view unit chat threads"
  ON public.unit_chat_threads FOR SELECT
  USING (
    CASE entity_type
      WHEN 'GUILD' THEN EXISTS (SELECT 1 FROM public.guild_members WHERE guild_id = entity_id AND user_id = auth.uid())
      WHEN 'QUEST' THEN EXISTS (
        SELECT 1 FROM public.quest_participants WHERE quest_id = entity_id AND user_id = auth.uid()
        UNION ALL
        SELECT 1 FROM public.quests WHERE id = entity_id AND created_by_user_id = auth.uid()
      )
      WHEN 'POD' THEN EXISTS (SELECT 1 FROM public.pod_members WHERE pod_id = entity_id AND user_id = auth.uid())
      WHEN 'COMPANY' THEN EXISTS (SELECT 1 FROM public.company_members WHERE company_id = entity_id AND user_id = auth.uid())
      ELSE true
    END
  );

-- Authenticated users can create threads (thread is auto-created)
CREATE POLICY "Authenticated users can create unit chat threads"
  ON public.unit_chat_threads FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER update_unit_chat_threads_updated_at
  BEFORE UPDATE ON public.unit_chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Unit Chat Messages
-- ============================================
CREATE TABLE public.unit_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.unit_chat_threads(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'USER' CHECK (sender_type IN ('USER', 'AGENT', 'SYSTEM')),
  sender_user_id UUID,
  message_text TEXT NOT NULL,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.unit_chat_messages ENABLE ROW LEVEL SECURITY;

-- Members can view messages (same logic as thread)
CREATE POLICY "Members can view unit chat messages"
  ON public.unit_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.unit_chat_threads t
      WHERE t.id = thread_id
      AND (
        CASE t.entity_type
          WHEN 'GUILD' THEN EXISTS (SELECT 1 FROM public.guild_members WHERE guild_id = t.entity_id AND user_id = auth.uid())
          WHEN 'QUEST' THEN EXISTS (
            SELECT 1 FROM public.quest_participants WHERE quest_id = t.entity_id AND user_id = auth.uid()
            UNION ALL
            SELECT 1 FROM public.quests WHERE id = t.entity_id AND created_by_user_id = auth.uid()
          )
          WHEN 'POD' THEN EXISTS (SELECT 1 FROM public.pod_members WHERE pod_id = t.entity_id AND user_id = auth.uid())
          WHEN 'COMPANY' THEN EXISTS (SELECT 1 FROM public.company_members WHERE company_id = t.entity_id AND user_id = auth.uid())
          ELSE true
        END
      )
    )
  );

-- Members can insert messages
CREATE POLICY "Members can insert unit chat messages"
  ON public.unit_chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (sender_type = 'USER' AND sender_user_id = auth.uid())
  );

-- Agent messages inserted via service role (edge function)
-- No user policy needed for AGENT inserts

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.unit_chat_messages;

-- Index for fast message loading
CREATE INDEX idx_unit_chat_messages_thread_id ON public.unit_chat_messages(thread_id, created_at);

-- ============================================
-- Decision Polls
-- ============================================
CREATE TABLE public.decision_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  thread_id UUID REFERENCES public.unit_chat_threads(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view decision polls"
  ON public.decision_polls FOR SELECT
  USING (
    CASE entity_type
      WHEN 'GUILD' THEN EXISTS (SELECT 1 FROM public.guild_members WHERE guild_id = entity_id AND user_id = auth.uid())
      WHEN 'QUEST' THEN EXISTS (
        SELECT 1 FROM public.quest_participants WHERE quest_id = entity_id AND user_id = auth.uid()
        UNION ALL
        SELECT 1 FROM public.quests WHERE id = entity_id AND created_by_user_id = auth.uid()
      )
      WHEN 'POD' THEN EXISTS (SELECT 1 FROM public.pod_members WHERE pod_id = entity_id AND user_id = auth.uid())
      WHEN 'COMPANY' THEN EXISTS (SELECT 1 FROM public.company_members WHERE company_id = entity_id AND user_id = auth.uid())
      ELSE true
    END
  );

CREATE POLICY "Authenticated users can create polls"
  ON public.decision_polls FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update polls"
  ON public.decision_polls FOR UPDATE
  USING (auth.uid() = created_by);

CREATE TRIGGER update_decision_polls_updated_at
  BEFORE UPDATE ON public.decision_polls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Decision Poll Votes
-- ============================================
CREATE TABLE public.decision_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.decision_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);

ALTER TABLE public.decision_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view poll votes"
  ON public.decision_poll_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.decision_polls p
      WHERE p.id = poll_id
      AND (
        CASE p.entity_type
          WHEN 'GUILD' THEN EXISTS (SELECT 1 FROM public.guild_members WHERE guild_id = p.entity_id AND user_id = auth.uid())
          WHEN 'QUEST' THEN EXISTS (
            SELECT 1 FROM public.quest_participants WHERE quest_id = p.entity_id AND user_id = auth.uid()
            UNION ALL
            SELECT 1 FROM public.quests WHERE id = p.entity_id AND created_by_user_id = auth.uid()
          )
          WHEN 'POD' THEN EXISTS (SELECT 1 FROM public.pod_members WHERE pod_id = p.entity_id AND user_id = auth.uid())
          WHEN 'COMPANY' THEN EXISTS (SELECT 1 FROM public.company_members WHERE company_id = p.entity_id AND user_id = auth.uid())
          ELSE true
        END
      )
    )
  );

CREATE POLICY "Users can vote on polls"
  ON public.decision_poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change their vote"
  ON public.decision_poll_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their vote"
  ON public.decision_poll_votes FOR DELETE
  USING (auth.uid() = user_id);
