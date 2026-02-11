
-- Create user_spoken_languages junction table
CREATE TABLE public.user_spoken_languages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  language_code text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, language_code)
);

-- Enable RLS
ALTER TABLE public.user_spoken_languages ENABLE ROW LEVEL SECURITY;

-- Users can view their own spoken languages
CREATE POLICY "Users can view own spoken languages"
  ON public.user_spoken_languages FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own spoken languages
CREATE POLICY "Users can insert own spoken languages"
  ON public.user_spoken_languages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own spoken languages
CREATE POLICY "Users can delete own spoken languages"
  ON public.user_spoken_languages FOR DELETE
  USING (auth.uid() = user_id);

-- Users can update their own spoken languages (sort order)
CREATE POLICY "Users can update own spoken languages"
  ON public.user_spoken_languages FOR UPDATE
  USING (auth.uid() = user_id);

-- Public read policy so other users can see spoken languages (for translation priority)
CREATE POLICY "Anyone can view spoken languages"
  ON public.user_spoken_languages FOR SELECT
  USING (true);

-- Index for fast lookups
CREATE INDEX idx_user_spoken_languages_user ON public.user_spoken_languages(user_id);
CREATE INDEX idx_user_spoken_languages_code ON public.user_spoken_languages(language_code);
