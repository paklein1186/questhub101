
-- Add universe_type to topics (default 'impact' for all existing rows)
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS universe_type text NOT NULL DEFAULT 'impact';

-- Insert the 7 Creative Houses as separate topic entries
INSERT INTO public.topics (name, slug, universe_type) VALUES
  ('House of Light', 'house-of-light', 'creative'),
  ('House of Sound', 'house-of-sound', 'creative'),
  ('House of Story', 'house-of-story', 'creative'),
  ('House of Movement', 'house-of-movement', 'creative'),
  ('House of Form', 'house-of-form', 'creative'),
  ('House of Nature', 'house-of-nature', 'creative'),
  ('House of Ritual', 'house-of-ritual', 'creative')
ON CONFLICT DO NOTHING;
