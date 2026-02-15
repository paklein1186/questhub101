
-- Activity log table to track all user actions across the platform
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  -- e.g. 'guild_joined','guild_created','user_followed','post_created','post_upvoted',
  -- 'quest_highlighted','quest_created','quest_joined','company_joined','company_created',
  -- 'pod_joined','pod_created','course_enrolled','service_created','event_registered',
  -- 'territory_ai_fed','comment_created','booking_created','proposal_submitted'
  target_type TEXT, -- e.g. 'guild','user','post','quest','company','pod','course','service','event','territory'
  target_id TEXT,
  target_name TEXT, -- denormalized for display
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_activity_log_created ON public.activity_log(created_at DESC);
CREATE INDEX idx_activity_log_actor ON public.activity_log(actor_user_id, created_at DESC);
CREATE INDEX idx_activity_log_action ON public.activity_log(action_type, created_at DESC);
CREATE INDEX idx_activity_log_target ON public.activity_log(target_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Everyone can read the activity log (it's a public feed)
CREATE POLICY "Activity log is publicly readable"
  ON public.activity_log FOR SELECT USING (true);

-- Users can insert their own actions
CREATE POLICY "Users can log their own actions"
  ON public.activity_log FOR INSERT
  WITH CHECK (auth.uid() = actor_user_id);

-- Service role / triggers can also insert (for automated logging)
-- Allow admins to manage
CREATE POLICY "Admins can manage activity log"
  ON public.activity_log FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════
-- TRIGGERS to auto-log common actions
-- ═══════════════════════════════════════════════

-- 1. Guild member joined
CREATE OR REPLACE FUNCTION public.log_guild_join()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_log (actor_user_id, action_type, target_type, target_id, target_name)
  SELECT NEW.user_id, 'guild_joined', 'guild', NEW.guild_id, g.name
  FROM public.guilds g WHERE g.id = NEW.guild_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_guild_join
AFTER INSERT ON public.guild_members
FOR EACH ROW EXECUTE FUNCTION public.log_guild_join();

-- 2. Company member joined
CREATE OR REPLACE FUNCTION public.log_company_join()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_log (actor_user_id, action_type, target_type, target_id, target_name)
  SELECT NEW.user_id, 'company_joined', 'company', NEW.company_id, c.name
  FROM public.companies c WHERE c.id = NEW.company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_company_join
AFTER INSERT ON public.company_members
FOR EACH ROW EXECUTE FUNCTION public.log_company_join();

-- 3. Pod member joined
CREATE OR REPLACE FUNCTION public.log_pod_join()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_log (actor_user_id, action_type, target_type, target_id, target_name)
  SELECT NEW.user_id, 'pod_joined', 'pod', NEW.pod_id, p.name
  FROM public.pods p WHERE p.id = NEW.pod_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_pod_join
AFTER INSERT ON public.pod_members
FOR EACH ROW EXECUTE FUNCTION public.log_pod_join();

-- 4. Follow action
CREATE OR REPLACE FUNCTION public.log_follow()
RETURNS TRIGGER AS $$
DECLARE
  t_name TEXT;
BEGIN
  IF NEW.target_type = 'USER' THEN
    SELECT name INTO t_name FROM public.profiles WHERE user_id = NEW.target_id;
  ELSIF NEW.target_type = 'GUILD' THEN
    SELECT name INTO t_name FROM public.guilds WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'COMPANY' THEN
    SELECT name INTO t_name FROM public.companies WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'QUEST' THEN
    SELECT title INTO t_name FROM public.quests WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'SERVICE' THEN
    SELECT title INTO t_name FROM public.services WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'COURSE' THEN
    SELECT title INTO t_name FROM public.courses WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'TERRITORY' THEN
    SELECT name INTO t_name FROM public.territories WHERE id = NEW.target_id;
  END IF;

  INSERT INTO public.activity_log (actor_user_id, action_type, target_type, target_id, target_name)
  VALUES (NEW.follower_id, 'followed', LOWER(NEW.target_type), NEW.target_id, t_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_follow
AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.log_follow();

-- 5. Post created
CREATE OR REPLACE FUNCTION public.log_post_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_log (actor_user_id, action_type, target_type, target_id, target_name, metadata)
  VALUES (NEW.author_user_id, 'post_created', 'post', NEW.id,
    LEFT(COALESCE(NEW.content, ''), 80),
    jsonb_build_object('context_type', NEW.context_type, 'context_id', NEW.context_id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_post_created
AFTER INSERT ON public.feed_posts
FOR EACH ROW EXECUTE FUNCTION public.log_post_created();

-- 6. Post upvoted
CREATE OR REPLACE FUNCTION public.log_post_upvoted()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_log (actor_user_id, action_type, target_type, target_id, target_name)
  SELECT NEW.user_id, 'post_upvoted', 'post', NEW.post_id,
    LEFT(COALESCE(fp.content, ''), 80)
  FROM public.feed_posts fp WHERE fp.id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_post_upvoted
AFTER INSERT ON public.post_upvotes
FOR EACH ROW EXECUTE FUNCTION public.log_post_upvoted();

-- 7. Quest highlighted
CREATE OR REPLACE FUNCTION public.log_quest_highlighted()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_log (actor_user_id, action_type, target_type, target_id, target_name)
  SELECT NEW.user_id, 'quest_highlighted', 'quest', NEW.quest_id, q.title
  FROM public.quests q WHERE q.id = NEW.quest_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_quest_highlighted
AFTER INSERT ON public.highlighted_quests
FOR EACH ROW EXECUTE FUNCTION public.log_quest_highlighted();

-- 8. Quest participant joined
CREATE OR REPLACE FUNCTION public.log_quest_joined()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_log (actor_user_id, action_type, target_type, target_id, target_name)
  SELECT NEW.user_id, 'quest_joined', 'quest', NEW.quest_id, q.title
  FROM public.quests q WHERE q.id = NEW.quest_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_quest_joined
AFTER INSERT ON public.quest_participants
FOR EACH ROW EXECUTE FUNCTION public.log_quest_joined();

-- 9. Comment created
CREATE OR REPLACE FUNCTION public.log_comment_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_log (actor_user_id, action_type, target_type, target_id, target_name, metadata)
  VALUES (NEW.author_id, 'comment_created', LOWER(NEW.target_type), NEW.target_id,
    LEFT(NEW.content, 80),
    jsonb_build_object('comment_id', NEW.id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_comment_created
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.log_comment_created();

-- 10. Course enrollment
CREATE OR REPLACE FUNCTION public.log_course_enrolled()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_log (actor_user_id, action_type, target_type, target_id, target_name)
  SELECT NEW.user_id, 'course_enrolled', 'course', NEW.course_id, c.title
  FROM public.courses c WHERE c.id = NEW.course_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_course_enrolled
AFTER INSERT ON public.course_enrollments
FOR EACH ROW EXECUTE FUNCTION public.log_course_enrolled();

-- 11. Event registration
CREATE OR REPLACE FUNCTION public.log_event_registered()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.activity_log (actor_user_id, action_type, target_type, target_id, target_name)
    SELECT NEW.user_id, 'event_registered', 'event', NEW.event_id, e.title
    FROM public.guild_events e WHERE e.id = NEW.event_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_event_registered
AFTER INSERT ON public.guild_event_attendees
FOR EACH ROW EXECUTE FUNCTION public.log_event_registered();
