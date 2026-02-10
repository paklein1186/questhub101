
-- 1. Quest Subtasks
CREATE TABLE public.quest_subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'TODO',
  assignee_user_id UUID,
  due_date TIMESTAMP WITH TIME ZONE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.quest_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subtasks viewable by everyone" ON public.quest_subtasks FOR SELECT USING (true);
CREATE POLICY "Quest owner or guild admin can insert subtasks" ON public.quest_subtasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM quests WHERE quests.id = quest_subtasks.quest_id AND quests.created_by_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM quests q JOIN guild_members gm ON gm.guild_id = q.guild_id WHERE q.id = quest_subtasks.quest_id AND gm.user_id = auth.uid() AND gm.role = 'ADMIN')
);
CREATE POLICY "Quest owner, guild admin, or assignee can update subtasks" ON public.quest_subtasks FOR UPDATE USING (
  auth.uid() = assignee_user_id
  OR EXISTS (SELECT 1 FROM quests WHERE quests.id = quest_subtasks.quest_id AND quests.created_by_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM quests q JOIN guild_members gm ON gm.guild_id = q.guild_id WHERE q.id = quest_subtasks.quest_id AND gm.user_id = auth.uid() AND gm.role = 'ADMIN')
);
CREATE POLICY "Quest owner or guild admin can delete subtasks" ON public.quest_subtasks FOR DELETE USING (
  EXISTS (SELECT 1 FROM quests WHERE quests.id = quest_subtasks.quest_id AND quests.created_by_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM quests q JOIN guild_members gm ON gm.guild_id = q.guild_id WHERE q.id = quest_subtasks.quest_id AND gm.user_id = auth.uid() AND gm.role = 'ADMIN')
);

-- 2. Guild Docs
CREATE TABLE public.guild_docs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  created_by_user_id UUID NOT NULL,
  updated_by_user_id UUID,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.guild_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guild members can view docs" ON public.guild_docs FOR SELECT USING (
  EXISTS (SELECT 1 FROM guild_members WHERE guild_members.guild_id = guild_docs.guild_id AND guild_members.user_id = auth.uid())
);
CREATE POLICY "Guild members can create docs" ON public.guild_docs FOR INSERT WITH CHECK (
  auth.uid() = created_by_user_id
  AND EXISTS (SELECT 1 FROM guild_members WHERE guild_members.guild_id = guild_docs.guild_id AND guild_members.user_id = auth.uid())
);
CREATE POLICY "Guild members can update docs" ON public.guild_docs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM guild_members WHERE guild_members.guild_id = guild_docs.guild_id AND guild_members.user_id = auth.uid())
);
CREATE POLICY "Doc author or guild admin can delete docs" ON public.guild_docs FOR DELETE USING (
  auth.uid() = created_by_user_id
  OR EXISTS (SELECT 1 FROM guild_members WHERE guild_members.guild_id = guild_docs.guild_id AND guild_members.user_id = auth.uid() AND guild_members.role = 'ADMIN')
);

-- 3. Guild Events
CREATE TABLE public.guild_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE,
  location_type TEXT NOT NULL DEFAULT 'ONLINE',
  location_text TEXT,
  call_url TEXT,
  created_by_user_id UUID NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'GUILD_MEMBERS',
  max_attendees INTEGER,
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.guild_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guild members can view guild events" ON public.guild_events FOR SELECT USING (
  visibility = 'PUBLIC_LINK'
  OR EXISTS (SELECT 1 FROM guild_members WHERE guild_members.guild_id = guild_events.guild_id AND guild_members.user_id = auth.uid())
);
CREATE POLICY "Guild members can create events" ON public.guild_events FOR INSERT WITH CHECK (
  auth.uid() = created_by_user_id
  AND EXISTS (SELECT 1 FROM guild_members WHERE guild_members.guild_id = guild_events.guild_id AND guild_members.user_id = auth.uid())
);
CREATE POLICY "Event creator or guild admin can update events" ON public.guild_events FOR UPDATE USING (
  auth.uid() = created_by_user_id
  OR EXISTS (SELECT 1 FROM guild_members WHERE guild_members.guild_id = guild_events.guild_id AND guild_members.user_id = auth.uid() AND guild_members.role = 'ADMIN')
);
CREATE POLICY "Event creator or guild admin can delete events" ON public.guild_events FOR DELETE USING (
  auth.uid() = created_by_user_id
  OR EXISTS (SELECT 1 FROM guild_members WHERE guild_members.guild_id = guild_events.guild_id AND guild_members.user_id = auth.uid() AND guild_members.role = 'ADMIN')
);

-- 4. Guild Event Attendees
CREATE TABLE public.guild_event_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.guild_events(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'REGISTERED',
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.guild_event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attendees viewable by guild members and event participants" ON public.guild_event_attendees FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM guild_events ge JOIN guild_members gm ON gm.guild_id = ge.guild_id
    WHERE ge.id = guild_event_attendees.event_id AND gm.user_id = auth.uid()
  )
);
CREATE POLICY "Users can register for events" ON public.guild_event_attendees FOR INSERT WITH CHECK (
  auth.uid() = user_id OR user_id IS NULL
);
CREATE POLICY "Users can update own attendance" ON public.guild_event_attendees FOR UPDATE USING (
  auth.uid() = user_id
);
CREATE POLICY "Users can cancel own attendance or admin can manage" ON public.guild_event_attendees FOR DELETE USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM guild_events ge JOIN guild_members gm ON gm.guild_id = ge.guild_id
    WHERE ge.id = guild_event_attendees.event_id AND gm.user_id = auth.uid() AND gm.role = 'ADMIN'
  )
);
