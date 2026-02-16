
-- Table to store items a user wants hidden from their public profile
CREATE TABLE public.profile_masked_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL, -- GUILD, POD, COMPANY, USER, QUEST
  target_name TEXT, -- cached name for display in settings
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_id, target_type)
);

-- Enable RLS
ALTER TABLE public.profile_masked_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own masked items
CREATE POLICY "Users can view own masked items"
ON public.profile_masked_items FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own masked items
CREATE POLICY "Users can insert own masked items"
ON public.profile_masked_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own masked items
CREATE POLICY "Users can delete own masked items"
ON public.profile_masked_items FOR DELETE
USING (auth.uid() = user_id);

-- Anyone can read masked items to filter on profile pages (need to know what's hidden)
CREATE POLICY "Anyone can read masked items for filtering"
ON public.profile_masked_items FOR SELECT
USING (true);

-- Index for fast lookups
CREATE INDEX idx_profile_masked_items_user ON public.profile_masked_items (user_id);
