
-- ═══════════════════════════════════════════════════════════════
-- 1. discussion_rooms table
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.discussion_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('GUILD', 'QUEST')),
  scope_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  audience_type TEXT NOT NULL DEFAULT 'MEMBERS',
  allowed_role_ids UUID[] DEFAULT '{}',
  can_post_audience_type TEXT NOT NULL DEFAULT 'MEMBERS',
  can_reply_audience_type TEXT NOT NULL DEFAULT 'MEMBERS',
  can_manage_audience_type TEXT NOT NULL DEFAULT 'ADMINS_ONLY',
  can_manage_role_ids UUID[] DEFAULT '{}',
  created_by_user_id UUID NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discussion_rooms_scope ON public.discussion_rooms (scope_type, scope_id);

ALTER TABLE public.discussion_rooms ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read rooms (visibility enforced in app)
CREATE POLICY "Authenticated users can read rooms"
  ON public.discussion_rooms FOR SELECT TO authenticated
  USING (true);

-- Room creators and admins can insert
CREATE POLICY "Authenticated users can create rooms"
  ON public.discussion_rooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by_user_id);

-- Room management: creator or admin (enforced in app layer)
CREATE POLICY "Room creator or admin can update"
  ON public.discussion_rooms FOR UPDATE TO authenticated
  USING (auth.uid() = created_by_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Room creator or admin can delete"
  ON public.discussion_rooms FOR DELETE TO authenticated
  USING (auth.uid() = created_by_user_id OR public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_discussion_rooms_updated_at
  BEFORE UPDATE ON public.discussion_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 2. Add room_id to feed_posts
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.feed_posts
  ADD COLUMN room_id UUID REFERENCES public.discussion_rooms(id) ON DELETE SET NULL;

CREATE INDEX idx_feed_posts_room_id ON public.feed_posts (room_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. Add audience columns to decision_polls
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.decision_polls
  ADD COLUMN visibility_audience_type TEXT NOT NULL DEFAULT 'MEMBERS',
  ADD COLUMN allowed_visibility_role_ids UUID[] DEFAULT '{}',
  ADD COLUMN can_vote_audience_type TEXT NOT NULL DEFAULT 'MEMBERS',
  ADD COLUMN allowed_vote_role_ids UUID[] DEFAULT '{}',
  ADD COLUMN can_manage_decision_audience_type TEXT NOT NULL DEFAULT 'ADMINS_ONLY',
  ADD COLUMN can_manage_decision_role_ids UUID[] DEFAULT '{}';

-- ═══════════════════════════════════════════════════════════════
-- 4. Create default rooms for existing guilds
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.discussion_rooms (scope_type, scope_id, name, description, audience_type, can_post_audience_type, can_reply_audience_type, can_manage_audience_type, created_by_user_id, is_default, sort_order)
SELECT 'GUILD', g.id, 'General', 'Default discussion room', 'MEMBERS', 'MEMBERS', 'MEMBERS', 'ADMINS_ONLY', g.created_by_user_id, true, 0
FROM public.guilds g
WHERE g.is_deleted = false;

-- ═══════════════════════════════════════════════════════════════
-- 5. Create default rooms for existing quests
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.discussion_rooms (scope_type, scope_id, name, description, audience_type, can_post_audience_type, can_reply_audience_type, can_manage_audience_type, created_by_user_id, is_default, sort_order)
SELECT 'QUEST', q.id, 'General', 'Default discussion room', 'MEMBERS', 'MEMBERS', 'MEMBERS', 'ADMINS_ONLY', q.created_by_user_id, true, 0
FROM public.quests q
WHERE q.is_deleted = false;

-- ═══════════════════════════════════════════════════════════════
-- 6. Migrate existing guild discussion posts to default rooms
-- ═══════════════════════════════════════════════════════════════
UPDATE public.feed_posts fp
SET room_id = dr.id
FROM public.discussion_rooms dr
WHERE fp.context_type = 'GUILD_DISCUSSION'
  AND fp.context_id::uuid = dr.scope_id
  AND dr.scope_type = 'GUILD'
  AND dr.is_default = true
  AND fp.room_id IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- 7. Migrate existing quest discussion posts to default rooms
-- ═══════════════════════════════════════════════════════════════
UPDATE public.feed_posts fp
SET room_id = dr.id
FROM public.discussion_rooms dr
WHERE fp.context_type = 'QUEST_DISCUSSION'
  AND fp.context_id::uuid = dr.scope_id
  AND dr.scope_type = 'QUEST'
  AND dr.is_default = true
  AND fp.room_id IS NULL;
