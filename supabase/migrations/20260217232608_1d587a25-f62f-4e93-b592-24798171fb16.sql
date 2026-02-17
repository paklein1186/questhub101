
-- Funding campaigns: each has a goal to reach in credits or fiat
CREATE TABLE public.quest_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  goal_amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'CREDITS',        -- CREDITS | FIAT
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'ACTIVE',       -- ACTIVE | COMPLETED | CANCELLED
  raised_amount NUMERIC NOT NULL DEFAULT 0,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quest_campaigns ENABLE ROW LEVEL SECURITY;

-- Anyone can view campaigns
CREATE POLICY "Anyone can view quest campaigns"
  ON public.quest_campaigns FOR SELECT USING (true);

-- Quest owner or admin can manage
CREATE POLICY "Quest owner can insert campaigns"
  ON public.quest_campaigns FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.quests q WHERE q.id = quest_id AND q.created_by_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Quest owner can update campaigns"
  ON public.quest_campaigns FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.quests q WHERE q.id = quest_id AND q.created_by_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Quest owner can delete campaigns"
  ON public.quest_campaigns FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.quests q WHERE q.id = quest_id AND q.created_by_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Auto-update updated_at
CREATE TRIGGER update_quest_campaigns_updated_at
  BEFORE UPDATE ON public.quest_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
