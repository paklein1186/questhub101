
-- Milestones definition table
CREATE TABLE public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  reward_type TEXT NOT NULL DEFAULT 'NONE' CHECK (reward_type IN ('XP', 'CREDITS', 'BADGE', 'NONE')),
  reward_amount INTEGER DEFAULT 0,
  persona_visibility TEXT NOT NULL DEFAULT 'ALL' CHECK (persona_visibility IN ('ALL', 'CREATIVE', 'IMPACT', 'HYBRID')),
  trigger_type TEXT NOT NULL DEFAULT 'USER_ACTION' CHECK (trigger_type IN ('USER_ACTION', 'SYSTEM_STATE', 'TIME_BASED', 'AI_SUGGESTED')),
  trigger_config JSONB DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '✨',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- Everyone can read milestones (they're definitions)
CREATE POLICY "Milestones are readable by everyone"
  ON public.milestones FOR SELECT USING (true);

-- Only admins can manage milestones
CREATE POLICY "Admins can manage milestones"
  ON public.milestones FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User milestones (progress tracking)
CREATE TABLE public.user_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  reward_delivered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, milestone_id)
);

ALTER TABLE public.user_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own milestones"
  ON public.user_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own milestones"
  ON public.user_milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own milestones"
  ON public.user_milestones FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can read all user milestones (for analytics)
CREATE POLICY "Admins can read all user milestones"
  ON public.user_milestones FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage user milestones"
  ON public.user_milestones FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add milestone_popups_enabled to profiles (user preference)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS milestone_popups_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_milestone_popup_at TIMESTAMPTZ;

-- Seed milestone definitions
INSERT INTO public.milestones (code, title, description, reward_type, reward_amount, persona_visibility, trigger_type, trigger_config, sort_order, icon) VALUES
  ('complete_profile', 'Complete your profile', 'Fill out your name, bio, avatar, and headline to make a great first impression.', 'XP', 25, 'ALL', 'SYSTEM_STATE', '{"check": "profile_completeness", "threshold": 70}', 1, '👤'),
  ('add_spoken_languages', 'Add spoken languages', 'Set your spoken languages so the community knows how to collaborate with you.', 'XP', 5, 'ALL', 'USER_ACTION', '{"check": "spoken_languages_count", "min": 1}', 2, '🌍'),
  ('join_first_guild', 'Join your first Guild', 'Become a member of a guild to start collaborating with others.', 'XP', 30, 'ALL', 'USER_ACTION', '{"check": "guild_membership_count", "min": 1}', 3, '🛡️'),
  ('create_first_quest', 'Create your first Quest', 'Launch a quest to start building with the community.', 'CREDITS', 50, 'ALL', 'USER_ACTION', '{"check": "quest_created_count", "min": 1}', 4, '⚔️'),
  ('publish_service', 'Publish a Service', 'Offer your skills and expertise to the community.', 'XP', 15, 'ALL', 'USER_ACTION', '{"check": "service_count", "min": 1}', 5, '🛒'),
  ('collaborate_pod', 'Collaborate in a Pod', 'Join or create a pod to work in a small group.', 'XP', 20, 'ALL', 'USER_ACTION', '{"check": "pod_membership_count", "min": 1}', 6, '🫧'),
  ('contribute_territory', 'Contribute to a Territory', 'Add a memory entry to enrich a territory''s knowledge base.', 'XP', 40, 'ALL', 'USER_ACTION', '{"check": "territory_memory_count", "min": 1}', 7, '🗺️'),
  ('attend_event', 'Attend an Event', 'Register or participate in a community event.', 'CREDITS', 20, 'ALL', 'USER_ACTION', '{"check": "event_attendance_count", "min": 1}', 8, '📅'),
  ('invite_friend', 'Invite a friend', 'Bring someone new into the community.', 'CREDITS', 50, 'ALL', 'USER_ACTION', '{"check": "referral_count", "min": 1}', 9, '💌'),
  ('become_shareholder', 'Become a Shareholder', 'Purchase shares to become a contributor-owner of the cooperative.', 'BADGE', 0, 'ALL', 'USER_ACTION', '{"check": "shareholding_count", "min": 1}', 10, '👑'),
  ('publish_course', 'Publish a Course', 'Create and publish a course with at least one lesson.', 'XP', 60, 'ALL', 'USER_ACTION', '{"check": "published_course_count", "min": 1}', 11, '🎓'),
  ('creative_artwork_quest', 'Create an artwork quest', 'Launch your first creative project as a quest.', 'XP', 30, 'CREATIVE', 'USER_ACTION', '{"check": "quest_created_count", "min": 1}', 20, '🎨'),
  ('join_creative_circle', 'Join a Circle or Studio', 'Find your creative collective and start making together.', 'XP', 25, 'CREATIVE', 'USER_ACTION', '{"check": "guild_membership_count", "min": 1}', 21, '🔵'),
  ('creative_class', 'Publish a creative class', 'Share your craft through a course or workshop.', 'XP', 50, 'CREATIVE', 'USER_ACTION', '{"check": "published_course_count", "min": 1}', 22, '🎭'),
  ('impact_territory_memory', 'Add your first territory memory', 'Document local knowledge for your community.', 'XP', 35, 'IMPACT', 'USER_ACTION', '{"check": "territory_memory_count", "min": 1}', 30, '📍'),
  ('impact_quest', 'Create an impact quest', 'Start a mission that creates change in your territory.', 'XP', 40, 'IMPACT', 'USER_ACTION', '{"check": "quest_created_count", "min": 1}', 31, '🌱'),
  ('impact_guild', 'Join an impact guild', 'Team up with others working on social and environmental challenges.', 'XP', 30, 'IMPACT', 'USER_ACTION', '{"check": "guild_membership_count", "min": 1}', 32, '🤝'),
  ('host_workshop', 'Host a workshop', 'Organize a community event to share knowledge.', 'XP', 45, 'IMPACT', 'USER_ACTION', '{"check": "event_hosted_count", "min": 1}', 33, '🏫');

-- Trigger for updated_at
CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
