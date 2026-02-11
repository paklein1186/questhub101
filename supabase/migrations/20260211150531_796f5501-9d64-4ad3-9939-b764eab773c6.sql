
-- Languages table
CREATE TABLE public.languages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed EN and FR
INSERT INTO public.languages (code, name, is_enabled) VALUES
  ('en', 'English', true),
  ('fr', 'Français', true);

ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Languages are readable by everyone"
  ON public.languages FOR SELECT USING (true);

CREATE POLICY "Only superadmins manage languages"
  ON public.languages FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Add preferred_language to profiles
ALTER TABLE public.profiles ADD COLUMN preferred_language TEXT NOT NULL DEFAULT 'en';

-- Content translations table
CREATE TABLE public.content_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  language_code TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  translated_by TEXT NOT NULL DEFAULT 'AI',
  auto_generated BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, field_name, language_code)
);

CREATE INDEX idx_content_translations_lookup
  ON public.content_translations (entity_type, entity_id, field_name, language_code);

ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;

-- Everyone can read translations
CREATE POLICY "Translations are readable by everyone"
  ON public.content_translations FOR SELECT USING (true);

-- Authenticated users can insert translations for their own content
CREATE POLICY "Authenticated users can insert translations"
  ON public.content_translations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update translations they created or that are auto-generated
CREATE POLICY "Authenticated users can update translations"
  ON public.content_translations FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_content_translations_updated_at
  BEFORE UPDATE ON public.content_translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
