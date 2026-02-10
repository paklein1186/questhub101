
-- Feature flags table for platform controls
CREATE TABLE public.feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  category TEXT NOT NULL DEFAULT 'CORE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read feature flags (needed for UI gating)
CREATE POLICY "Anyone can read feature flags"
  ON public.feature_flags FOR SELECT
  USING (true);

-- Only superadmins can modify feature flags
CREATE POLICY "Superadmins can insert feature flags"
  ON public.feature_flags FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update feature flags"
  ON public.feature_flags FOR UPDATE
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can delete feature flags"
  ON public.feature_flags FOR DELETE
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Trigger for updated_at
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial feature flags
INSERT INTO public.feature_flags (key, label, description, enabled, category) VALUES
  -- CORE
  ('feature_guilds', 'Guilds & Collectives', 'Enable guild/collective creation and browsing', true, 'CORE'),
  ('feature_companies', 'Companies', 'Enable company creation and browsing', true, 'CORE'),
  ('feature_pods', 'Pods', 'Enable pod creation and collaboration', true, 'CORE'),
  ('feature_services', 'Services / Skill Sessions', 'Enable service marketplace and bookings', true, 'CORE'),
  ('feature_courses', 'Courses & Lessons', 'Enable course creation and learning modules', true, 'CORE'),
  ('feature_events', 'Events', 'Enable guild events and calendars', true, 'CORE'),
  -- NETWORK & EXPLORE
  ('feature_network_section', 'Network Section', 'Show the Network tab in main navigation', true, 'NETWORK'),
  ('feature_territories', 'Territories', 'Enable territory features and explore', true, 'NETWORK'),
  ('feature_advanced_filters', 'Advanced Filters', 'Enable advanced filtering in explore views', true, 'NETWORK'),
  -- AI
  ('feature_ai_agents', 'AI Agents', 'Enable AI chat agents on units', true, 'AI'),
  ('feature_ai_muses_creative', 'AI Muses (Creative)', 'Enable creative muse AI personalities', true, 'AI'),
  ('feature_ai_territory_agents', 'Territory AI Agents', 'Enable territory-specific AI agents', true, 'AI'),
  ('feature_ai_matchmaking', 'AI Matchmaking', 'Enable AI-powered collaborator matching', true, 'AI'),
  -- ECONOMY
  ('feature_credits', 'Credits', 'Enable credit economy system', true, 'ECONOMY'),
  ('feature_xp', 'XP & Levels', 'Enable XP, levels and achievements', true, 'ECONOMY'),
  ('feature_contribution_index', 'Contribution Index', 'Show contribution index on profiles', true, 'ECONOMY'),
  -- MISC
  ('feature_starred_excerpts', 'Starred Excerpts', 'Enable excerpt starring and sharing', true, 'MISC'),
  ('feature_polls_decision', 'Polls & Decisions', 'Enable decision polls in units', true, 'MISC'),
  ('feature_courses_marketplace', 'Courses Marketplace', 'Enable public course marketplace browsing', true, 'MISC')
ON CONFLICT (key) DO NOTHING;
