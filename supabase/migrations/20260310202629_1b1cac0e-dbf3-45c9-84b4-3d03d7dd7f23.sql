
-- MIGRATION 10E: Distribution tracking and unfairness reports

CREATE TABLE public.quest_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('coins','ctg')),
  total_amount NUMERIC(12,2) NOT NULL,
  distribution_mode TEXT NOT NULL CHECK (distribution_mode IN ('manual','ocu_pie','equal','campaign_threshold')),
  distributed_by UUID,
  distributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient_snapshot JSONB NOT NULL,
  flagged BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.quest_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view distributions"
  ON public.quest_distributions FOR SELECT TO authenticated
  USING (true);

CREATE TABLE public.distribution_unfairness_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL,
  distribution_id UUID REFERENCES public.quest_distributions(id),
  currency TEXT NOT NULL CHECK (currency IN ('coins','ctg')),
  reason TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  superadmin_note TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.distribution_unfairness_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own unfairness reports"
  ON public.distribution_unfairness_reports FOR SELECT TO authenticated
  USING (reporter_user_id = auth.uid());

CREATE POLICY "Users can insert their own unfairness reports"
  ON public.distribution_unfairness_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_user_id = auth.uid());
