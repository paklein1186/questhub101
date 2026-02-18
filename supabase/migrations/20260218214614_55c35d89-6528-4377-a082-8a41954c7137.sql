
CREATE TABLE IF NOT EXISTS public.quest_needs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'GENERAL',
  status TEXT DEFAULT 'OPEN',
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quest_needs ENABLE ROW LEVEL SECURITY;

-- Anyone can view quest needs
CREATE POLICY "Anyone can view quest needs"
  ON public.quest_needs FOR SELECT
  USING (true);

-- Quest owners and global admins can insert
CREATE POLICY "Quest owners can insert quest needs"
  ON public.quest_needs FOR INSERT
  WITH CHECK (auth.uid() = created_by_user_id);

-- Quest owners can update/delete their needs
CREATE POLICY "Quest needs creators can update"
  ON public.quest_needs FOR UPDATE
  USING (auth.uid() = created_by_user_id);

CREATE POLICY "Quest needs creators can delete"
  ON public.quest_needs FOR DELETE
  USING (
    auth.uid() = created_by_user_id
    OR auth.uid() = (SELECT created_by_user_id FROM public.quests WHERE id = quest_id)
  );

CREATE TRIGGER update_quest_needs_updated_at
  BEFORE UPDATE ON public.quest_needs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
