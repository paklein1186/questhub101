
-- ============================================================
-- Create all missing tables for persistent storage
-- ============================================================

-- 1. Companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  banner_url TEXT,
  description TEXT,
  sector TEXT,
  size TEXT,
  website_url TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  instagram_url TEXT,
  contact_user_id UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies are viewable by everyone"
  ON public.companies FOR SELECT USING (is_deleted = false);

CREATE POLICY "Authenticated users can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Contact users and admins can update companies"
  ON public.companies FOR UPDATE
  USING (auth.uid() = contact_user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Add FK from company_members and company_applications to companies
ALTER TABLE public.company_members
  ADD CONSTRAINT company_members_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE public.company_applications
  ADD CONSTRAINT company_applications_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES public.companies(id);

-- 2. Services
CREATE TABLE IF NOT EXISTS public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  provider_user_id UUID,
  provider_guild_id UUID REFERENCES public.guilds(id),
  duration_minutes INTEGER,
  price_currency TEXT NOT NULL DEFAULT 'EUR',
  price_amount NUMERIC,
  online_location_type TEXT,
  online_location_url_template TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_draft BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published services are viewable by everyone"
  ON public.services FOR SELECT
  USING (is_deleted = false AND (is_draft = false OR provider_user_id = auth.uid()));

CREATE POLICY "Users can create services"
  ON public.services FOR INSERT
  WITH CHECK (auth.uid() = provider_user_id);

CREATE POLICY "Providers can update their services"
  ON public.services FOR UPDATE
  USING (auth.uid() = provider_user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Service Topics & Territories
CREATE TABLE IF NOT EXISTS public.service_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id)
);

ALTER TABLE public.service_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service topics are viewable by everyone"
  ON public.service_topics FOR SELECT USING (true);

CREATE POLICY "Service owners can manage topics"
  ON public.service_topics FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.services WHERE id = service_id AND provider_user_id = auth.uid()));

CREATE POLICY "Service owners can delete topics"
  ON public.service_topics FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.services WHERE id = service_id AND provider_user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.service_territories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES public.territories(id)
);

ALTER TABLE public.service_territories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service territories are viewable by everyone"
  ON public.service_territories FOR SELECT USING (true);

CREATE POLICY "Service owners can manage territories"
  ON public.service_territories FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.services WHERE id = service_id AND provider_user_id = auth.uid()));

CREATE POLICY "Service owners can delete territories"
  ON public.service_territories FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.services WHERE id = service_id AND provider_user_id = auth.uid()));

-- 3. Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id),
  requester_id UUID NOT NULL,
  provider_user_id UUID,
  provider_guild_id UUID REFERENCES public.guilds(id),
  company_id UUID REFERENCES public.companies(id),
  requested_date_time TIMESTAMPTZ,
  start_date_time TIMESTAMPTZ,
  end_date_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  amount NUMERIC,
  currency TEXT,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  payment_status TEXT,
  call_url TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = provider_user_id);

CREATE POLICY "Users can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Booking parties can update"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = provider_user_id);

-- 4. Availability
CREATE TABLE IF NOT EXISTS public.availability_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_user_id UUID NOT NULL,
  service_id UUID REFERENCES public.services(id),
  weekday INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Availability rules are viewable by everyone"
  ON public.availability_rules FOR SELECT USING (true);

CREATE POLICY "Users can create own availability rules"
  ON public.availability_rules FOR INSERT
  WITH CHECK (auth.uid() = provider_user_id);

CREATE POLICY "Users can update own availability rules"
  ON public.availability_rules FOR UPDATE
  USING (auth.uid() = provider_user_id);

CREATE POLICY "Users can delete own availability rules"
  ON public.availability_rules FOR DELETE
  USING (auth.uid() = provider_user_id);

CREATE TABLE IF NOT EXISTS public.availability_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_user_id UUID NOT NULL,
  date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT false,
  start_time TEXT,
  end_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.availability_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Availability exceptions are viewable by everyone"
  ON public.availability_exceptions FOR SELECT USING (true);

CREATE POLICY "Users can create own availability exceptions"
  ON public.availability_exceptions FOR INSERT
  WITH CHECK (auth.uid() = provider_user_id);

CREATE POLICY "Users can update own availability exceptions"
  ON public.availability_exceptions FOR UPDATE
  USING (auth.uid() = provider_user_id);

CREATE POLICY "Users can delete own availability exceptions"
  ON public.availability_exceptions FOR DELETE
  USING (auth.uid() = provider_user_id);

-- 5. Courses & Lessons
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  level TEXT NOT NULL DEFAULT 'BEGINNER',
  owner_type TEXT NOT NULL DEFAULT 'USER',
  owner_user_id UUID,
  owner_guild_id UUID REFERENCES public.guilds(id),
  owner_company_id UUID REFERENCES public.companies(id),
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_free BOOLEAN NOT NULL DEFAULT true,
  price_amount NUMERIC,
  price_currency TEXT DEFAULT 'EUR',
  stripe_price_id TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published courses viewable by everyone"
  ON public.courses FOR SELECT
  USING (is_deleted = false AND (is_published = true OR owner_user_id = auth.uid()));

CREATE POLICY "Users can create courses"
  ON public.courses FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners can update courses"
  ON public.courses FOR UPDATE
  USING (auth.uid() = owner_user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_markdown TEXT,
  video_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_preview BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lessons viewable by everyone"
  ON public.lessons FOR SELECT USING (true);

CREATE POLICY "Course owners can create lessons"
  ON public.lessons FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND owner_user_id = auth.uid()));

CREATE POLICY "Course owners can update lessons"
  ON public.lessons FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND owner_user_id = auth.uid()));

CREATE POLICY "Course owners can delete lessons"
  ON public.lessons FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND owner_user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id),
  user_id UUID NOT NULL,
  progress_percent NUMERIC NOT NULL DEFAULT 0,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(course_id, user_id)
);

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own enrollments"
  ON public.course_enrollments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Course owners can view enrollments"
  ON public.course_enrollments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND owner_user_id = auth.uid()));

CREATE POLICY "Users can enroll"
  ON public.course_enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollment"
  ON public.course_enrollments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.course_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id),
  user_id UUID NOT NULL,
  amount NUMERIC,
  currency TEXT DEFAULT 'EUR',
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

ALTER TABLE public.course_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON public.course_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create purchases"
  ON public.course_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own purchases"
  ON public.course_purchases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.course_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id)
);

ALTER TABLE public.course_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Course topics viewable by everyone"
  ON public.course_topics FOR SELECT USING (true);

CREATE POLICY "Course owners can manage topics"
  ON public.course_topics FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND owner_user_id = auth.uid()));

CREATE POLICY "Course owners can delete topics"
  ON public.course_topics FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND owner_user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.course_territories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES public.territories(id)
);

ALTER TABLE public.course_territories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Course territories viewable by everyone"
  ON public.course_territories FOR SELECT USING (true);

CREATE POLICY "Course owners can manage territories"
  ON public.course_territories FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND owner_user_id = auth.uid()));

CREATE POLICY "Course owners can delete territories"
  ON public.course_territories FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND owner_user_id = auth.uid()));

-- 6. Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  author_id UUID NOT NULL,
  parent_id UUID REFERENCES public.comments(id),
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  upvote_count INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
  ON public.comments FOR SELECT USING (is_deleted = false);

CREATE POLICY "Authenticated users can create comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = author_id);

CREATE TABLE IF NOT EXISTS public.comment_upvotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.comment_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Upvotes are viewable by everyone"
  ON public.comment_upvotes FOR SELECT USING (true);

CREATE POLICY "Users can upvote"
  ON public.comment_upvotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own upvotes"
  ON public.comment_upvotes FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  related_entity_type TEXT,
  related_entity_id TEXT,
  deep_link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- 8. Follows
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_id, target_type, target_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by everyone"
  ON public.follows FOR SELECT USING (true);

CREATE POLICY "Users can follow"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- 9. Quest Participants & Updates
CREATE TABLE IF NOT EXISTS public.quest_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id UUID NOT NULL REFERENCES public.quests(id),
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'FOLLOWER',
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(quest_id, user_id)
);

ALTER TABLE public.quest_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quest participants viewable by everyone"
  ON public.quest_participants FOR SELECT USING (true);

CREATE POLICY "Users can join quests"
  ON public.quest_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation"
  ON public.quest_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.quest_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id UUID NOT NULL REFERENCES public.quests(id),
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  type TEXT NOT NULL DEFAULT 'GENERAL',
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  is_draft BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quest_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quest updates viewable by everyone"
  ON public.quest_updates FOR SELECT
  USING (is_deleted = false AND (is_draft = false OR author_id = auth.uid()));

CREATE POLICY "Users can create quest updates"
  ON public.quest_updates FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own updates"
  ON public.quest_updates FOR UPDATE
  USING (auth.uid() = author_id);

-- 10. Achievements
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quest_id UUID REFERENCES public.quests(id),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements viewable by everyone"
  ON public.achievements FOR SELECT USING (true);

CREATE POLICY "System can create achievements"
  ON public.achievements FOR INSERT
  WITH CHECK (true);

-- 11. User Blocks
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks"
  ON public.user_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create blocks"
  ON public.user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete blocks"
  ON public.user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- 12. Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by_user_id UUID
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 13. Attachments
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attachments viewable by everyone"
  ON public.attachments FOR SELECT USING (true);

CREATE POLICY "Users can upload attachments"
  ON public.attachments FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by_user_id);

CREATE POLICY "Uploaders can delete attachments"
  ON public.attachments FOR DELETE
  USING (auth.uid() = uploaded_by_user_id);

-- 14. Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  owner_user_id UUID NOT NULL,
  used_by_user_id UUID,
  bonus_xp INTEGER NOT NULL DEFAULT 0,
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrals viewable by owner"
  ON public.referrals FOR SELECT
  USING (auth.uid() = owner_user_id OR auth.uid() = used_by_user_id);

CREATE POLICY "Users can create referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Referral usage can be updated"
  ON public.referrals FOR UPDATE
  USING (true);

-- 15. Topic Stewards & Features
CREATE TABLE IF NOT EXISTS public.topic_stewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.topics(id),
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'STEWARD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(topic_id, user_id)
);

ALTER TABLE public.topic_stewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Topic stewards viewable by everyone"
  ON public.topic_stewards FOR SELECT USING (true);

CREATE POLICY "Admins can create stewards"
  ON public.topic_stewards FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete stewards"
  ON public.topic_stewards FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.topic_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.topics(id),
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  added_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.topic_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Topic features viewable by everyone"
  ON public.topic_features FOR SELECT USING (true);

CREATE POLICY "Stewards and admins can create features"
  ON public.topic_features FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (SELECT 1 FROM public.topic_stewards WHERE topic_id = topic_features.topic_id AND user_id = auth.uid())
  );

CREATE POLICY "Stewards and admins can delete features"
  ON public.topic_features FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (SELECT 1 FROM public.topic_stewards WHERE topic_id = topic_features.topic_id AND user_id = auth.uid())
  );

-- Add updated_at triggers for new tables
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_availability_rules_updated_at BEFORE UPDATE ON public.availability_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quest_updates_updated_at BEFORE UPDATE ON public.quest_updates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
