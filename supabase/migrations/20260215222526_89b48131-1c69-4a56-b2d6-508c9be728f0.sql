
-- Table to store user-highlighted quests
CREATE TABLE public.highlighted_quests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, quest_id)
);

-- Enable RLS
ALTER TABLE public.highlighted_quests ENABLE ROW LEVEL SECURITY;

-- Everyone can see highlights (they're public on profiles)
CREATE POLICY "Highlights are publicly readable"
  ON public.highlighted_quests FOR SELECT
  USING (true);

-- Users can manage their own highlights
CREATE POLICY "Users can highlight their own quests"
  ON public.highlighted_quests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unhighlight their own quests"
  ON public.highlighted_quests FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookup
CREATE INDEX idx_highlighted_quests_user ON public.highlighted_quests(user_id);
CREATE INDEX idx_highlighted_quests_quest ON public.highlighted_quests(quest_id);
