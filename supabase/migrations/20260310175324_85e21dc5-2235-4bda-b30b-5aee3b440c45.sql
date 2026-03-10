ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS ocu_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS envelope_total NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS external_spending NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pie_frozen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pie_frozen_by UUID,
  ADD COLUMN IF NOT EXISTS pie_snapshot JSONB;

CREATE TABLE IF NOT EXISTS public.quest_external_spendings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quest_external_spendings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read external spendings"
  ON public.quest_external_spendings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own external spendings"
  ON public.quest_external_spendings
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own external spendings"
  ON public.quest_external_spendings
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own external spendings"
  ON public.quest_external_spendings
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());