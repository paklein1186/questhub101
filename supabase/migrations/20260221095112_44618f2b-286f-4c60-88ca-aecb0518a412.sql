
-- Add CMS fields to existing entity tables
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS public_visibility TEXT NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS web_scopes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS web_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS featured_order INTEGER;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS public_visibility TEXT NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS web_scopes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS web_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS featured_order INTEGER;

ALTER TABLE public.guilds
  ADD COLUMN IF NOT EXISTS public_visibility TEXT NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS web_scopes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS web_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS featured_order INTEGER;

-- Websites table
CREATE TABLE public.websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('user', 'guild', 'territory', 'program')),
  owner_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  theme JSONB NOT NULL DEFAULT '{"mode": "solar"}',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_websites_slug ON public.websites (slug);
CREATE INDEX idx_websites_owner ON public.websites (owner_type, owner_id);

-- Website pages table
CREATE TABLE public.website_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  page_type TEXT NOT NULL DEFAULT 'custom' CHECK (page_type IN ('home', 'about', 'services', 'projects', 'community', 'program', 'custom')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (website_id, slug)
);

CREATE INDEX idx_website_pages_website ON public.website_pages (website_id);

-- Website sections table
CREATE TABLE public.website_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.website_pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('hero', 'text_block', 'services_list', 'quests_list', 'guilds_list', 'projects_list', 'cta')),
  title TEXT,
  subtitle TEXT,
  body_markdown TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  selected_ids UUID[] DEFAULT '{}',
  filters JSONB DEFAULT '{}',
  layout TEXT DEFAULT 'grid' CHECK (layout IN ('grid', 'list', 'carousel')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_website_sections_page ON public.website_sections (page_id);

-- RLS
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_sections ENABLE ROW LEVEL SECURITY;

-- Public read for published websites
CREATE POLICY "Published websites are publicly readable"
  ON public.websites FOR SELECT
  USING (is_published = true);

-- Owners can manage their websites
CREATE POLICY "Owners can manage websites"
  ON public.websites FOR ALL
  TO authenticated
  USING (
    (owner_type = 'user' AND owner_id = auth.uid())
    OR (owner_type = 'guild' AND EXISTS (
      SELECT 1 FROM guild_members WHERE guild_id = owner_id AND user_id = auth.uid() AND role = 'ADMIN'
    ))
    OR (owner_type = 'territory' AND public.has_role(auth.uid(), 'admin'))
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    (owner_type = 'user' AND owner_id = auth.uid())
    OR (owner_type = 'guild' AND EXISTS (
      SELECT 1 FROM guild_members WHERE guild_id = owner_id AND user_id = auth.uid() AND role = 'ADMIN'
    ))
    OR (owner_type = 'territory' AND public.has_role(auth.uid(), 'admin'))
    OR public.has_role(auth.uid(), 'admin')
  );

-- Pages: public read for published websites, owner manage
CREATE POLICY "Pages of published websites are publicly readable"
  ON public.website_pages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.websites w WHERE w.id = website_id AND w.is_published = true
  ));

CREATE POLICY "Owners can manage website pages"
  ON public.website_pages FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.websites w WHERE w.id = website_id AND (
      (w.owner_type = 'user' AND w.owner_id = auth.uid())
      OR (w.owner_type = 'guild' AND EXISTS (
        SELECT 1 FROM guild_members WHERE guild_id = w.owner_id AND user_id = auth.uid() AND role = 'ADMIN'
      ))
      OR public.has_role(auth.uid(), 'admin')
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.websites w WHERE w.id = website_id AND (
      (w.owner_type = 'user' AND w.owner_id = auth.uid())
      OR (w.owner_type = 'guild' AND EXISTS (
        SELECT 1 FROM guild_members WHERE guild_id = w.owner_id AND user_id = auth.uid() AND role = 'ADMIN'
      ))
      OR public.has_role(auth.uid(), 'admin')
    )
  ));

-- Sections: same pattern
CREATE POLICY "Sections of published websites are publicly readable"
  ON public.website_sections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.website_pages wp
    JOIN public.websites w ON w.id = wp.website_id
    WHERE wp.id = page_id AND w.is_published = true
  ));

CREATE POLICY "Owners can manage website sections"
  ON public.website_sections FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.website_pages wp
    JOIN public.websites w ON w.id = wp.website_id
    WHERE wp.id = page_id AND (
      (w.owner_type = 'user' AND w.owner_id = auth.uid())
      OR (w.owner_type = 'guild' AND EXISTS (
        SELECT 1 FROM guild_members WHERE guild_id = w.owner_id AND user_id = auth.uid() AND role = 'ADMIN'
      ))
      OR public.has_role(auth.uid(), 'admin')
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.website_pages wp
    JOIN public.websites w ON w.id = wp.website_id
    WHERE wp.id = page_id AND (
      (w.owner_type = 'user' AND w.owner_id = auth.uid())
      OR (w.owner_type = 'guild' AND EXISTS (
        SELECT 1 FROM guild_members WHERE guild_id = w.owner_id AND user_id = auth.uid() AND role = 'ADMIN'
      ))
      OR public.has_role(auth.uid(), 'admin')
    )
  ));

-- Updated_at triggers
CREATE TRIGGER update_websites_updated_at BEFORE UPDATE ON public.websites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_website_pages_updated_at BEFORE UPDATE ON public.website_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_website_sections_updated_at BEFORE UPDATE ON public.website_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
