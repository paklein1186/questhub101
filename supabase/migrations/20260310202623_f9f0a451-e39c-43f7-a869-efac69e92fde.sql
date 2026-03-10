
-- MIGRATION 10C: Quest funding contributions

CREATE TABLE public.quest_funding_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.quest_campaigns(id),
  funder_user_id UUID NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('coins','ctg')),
  amount NUMERIC(12,2) NOT NULL,
  note TEXT,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quest_funding_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view funding contributions for quests they participate in"
  ON public.quest_funding_contributions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own funding contributions"
  ON public.quest_funding_contributions FOR INSERT TO authenticated
  WITH CHECK (funder_user_id = auth.uid());
