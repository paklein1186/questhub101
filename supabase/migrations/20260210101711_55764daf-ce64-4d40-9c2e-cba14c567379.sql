
-- ============================================================
-- 1. User Roles (secure admin access)
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Only admins can read roles; users can read their own
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Only admins can manage roles
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2. Topics (Houses)
-- ============================================================
CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Topics are viewable by everyone"
  ON public.topics FOR SELECT USING (true);

CREATE POLICY "Admins can manage topics"
  ON public.topics FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. Territories
-- ============================================================
CREATE TYPE public.territory_level AS ENUM ('TOWN', 'REGION', 'NATIONAL', 'OTHER');

CREATE TABLE public.territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  level territory_level NOT NULL DEFAULT 'TOWN',
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Territories are viewable by everyone"
  ON public.territories FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create territories"
  ON public.territories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage territories"
  ON public.territories FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. Guilds
-- ============================================================
CREATE TYPE public.guild_type AS ENUM ('GUILD', 'NETWORK', 'COLLECTIVE');
CREATE TYPE public.guild_member_role AS ENUM ('ADMIN', 'MEMBER');

CREATE TABLE public.guilds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  logo_url text,
  banner_url text,
  type guild_type NOT NULL DEFAULT 'GUILD',
  is_approved boolean NOT NULL DEFAULT false,
  is_draft boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_by_user_id uuid NOT NULL,
  website_url text,
  twitter_url text,
  linkedin_url text,
  instagram_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published guilds are viewable by everyone"
  ON public.guilds FOR SELECT
  USING (is_deleted = false AND (is_draft = false OR created_by_user_id = auth.uid()));

CREATE POLICY "Authenticated users can create guilds"
  ON public.guilds FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Creators and admins can update guilds"
  ON public.guilds FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.guild_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid REFERENCES public.guilds(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role guild_member_role NOT NULL DEFAULT 'MEMBER',
  joined_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guild members are viewable by everyone"
  ON public.guild_members FOR SELECT USING (true);

CREATE POLICY "Users can join guilds"
  ON public.guild_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can leave or admins can manage"
  ON public.guild_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. Quests
-- ============================================================
CREATE TYPE public.quest_status AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE public.monetization_type AS ENUM ('FREE', 'PAID', 'MIXED');

CREATE TABLE public.quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_image_url text,
  status quest_status NOT NULL DEFAULT 'OPEN',
  monetization_type monetization_type NOT NULL DEFAULT 'FREE',
  reward_xp integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_draft boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_by_user_id uuid NOT NULL,
  guild_id uuid REFERENCES public.guilds(id),
  company_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published quests are viewable by everyone"
  ON public.quests FOR SELECT
  USING (is_deleted = false AND (is_draft = false OR created_by_user_id = auth.uid()));

CREATE POLICY "Authenticated users can create quests"
  ON public.quests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Creators and admins can update quests"
  ON public.quests FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by_user_id OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 6. Pods
-- ============================================================
CREATE TYPE public.pod_type AS ENUM ('QUEST_POD', 'STUDY_POD');
CREATE TYPE public.pod_member_role AS ENUM ('HOST', 'MEMBER');

CREATE TABLE public.pods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  type pod_type NOT NULL DEFAULT 'QUEST_POD',
  quest_id uuid REFERENCES public.quests(id),
  topic_id uuid REFERENCES public.topics(id),
  creator_id uuid NOT NULL,
  start_date timestamptz,
  end_date timestamptz,
  is_draft boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published pods are viewable by everyone"
  ON public.pods FOR SELECT
  USING (is_deleted = false AND (is_draft = false OR creator_id = auth.uid()));

CREATE POLICY "Authenticated users can create pods"
  ON public.pods FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators and admins can update pods"
  ON public.pods FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.pod_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id uuid REFERENCES public.pods(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role pod_member_role NOT NULL DEFAULT 'MEMBER',
  joined_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pod_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pod members are viewable by everyone"
  ON public.pod_members FOR SELECT USING (true);

CREATE POLICY "Users can join pods"
  ON public.pod_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can leave or admins can manage"
  ON public.pod_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 7. Junction Tables (User/Guild/Quest ↔ Topics & Territories)
-- ============================================================

CREATE TABLE public.user_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (user_id, topic_id)
);
ALTER TABLE public.user_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own topics" ON public.user_topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own topics" ON public.user_topics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own topics" ON public.user_topics FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.user_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  territory_id uuid REFERENCES public.territories(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (user_id, territory_id)
);
ALTER TABLE public.user_territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own territories" ON public.user_territories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own territories" ON public.user_territories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own territories" ON public.user_territories FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.guild_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid REFERENCES public.guilds(id) ON DELETE CASCADE NOT NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (guild_id, topic_id)
);
ALTER TABLE public.guild_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guild topics are viewable by everyone" ON public.guild_topics FOR SELECT USING (true);
CREATE POLICY "Guild creators can manage topics" ON public.guild_topics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Guild creators can delete topics" ON public.guild_topics FOR DELETE TO authenticated USING (true);

CREATE TABLE public.guild_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid REFERENCES public.guilds(id) ON DELETE CASCADE NOT NULL,
  territory_id uuid REFERENCES public.territories(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (guild_id, territory_id)
);
ALTER TABLE public.guild_territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guild territories are viewable by everyone" ON public.guild_territories FOR SELECT USING (true);
CREATE POLICY "Guild creators can manage territories" ON public.guild_territories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Guild creators can delete territories" ON public.guild_territories FOR DELETE TO authenticated USING (true);

CREATE TABLE public.quest_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid REFERENCES public.quests(id) ON DELETE CASCADE NOT NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (quest_id, topic_id)
);
ALTER TABLE public.quest_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quest topics are viewable by everyone" ON public.quest_topics FOR SELECT USING (true);
CREATE POLICY "Quest creators can manage topics" ON public.quest_topics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Quest creators can delete topics" ON public.quest_topics FOR DELETE TO authenticated USING (true);

CREATE TABLE public.quest_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid REFERENCES public.quests(id) ON DELETE CASCADE NOT NULL,
  territory_id uuid REFERENCES public.territories(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (quest_id, territory_id)
);
ALTER TABLE public.quest_territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quest territories are viewable by everyone" ON public.quest_territories FOR SELECT USING (true);
CREATE POLICY "Quest creators can manage territories" ON public.quest_territories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Quest creators can delete territories" ON public.quest_territories FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 8. Updated_at triggers
-- ============================================================
CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON public.topics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_territories_updated_at BEFORE UPDATE ON public.territories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_guilds_updated_at BEFORE UPDATE ON public.guilds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quests_updated_at BEFORE UPDATE ON public.quests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pods_updated_at BEFORE UPDATE ON public.pods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
