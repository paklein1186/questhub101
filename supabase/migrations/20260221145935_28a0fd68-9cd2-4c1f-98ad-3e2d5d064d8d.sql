
-- Create quest_affiliations junction table for many-to-many quest<->entity relationships
CREATE TABLE public.quest_affiliations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('GUILD', 'COMPANY')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID NOT NULL,
  UNIQUE (quest_id, entity_type, entity_id)
);

-- Enable RLS
ALTER TABLE public.quest_affiliations ENABLE ROW LEVEL SECURITY;

-- Everyone can read affiliations
CREATE POLICY "Anyone can view quest affiliations"
  ON public.quest_affiliations FOR SELECT
  USING (true);

-- Quest owner or entity admin can insert affiliations
CREATE POLICY "Quest owner can manage affiliations"
  ON public.quest_affiliations FOR INSERT
  WITH CHECK (
    auth.uid() = created_by_user_id
    AND (
      EXISTS (SELECT 1 FROM quests WHERE id = quest_id AND created_by_user_id = auth.uid())
    )
  );

-- Quest owner can delete affiliations
CREATE POLICY "Quest owner can delete affiliations"
  ON public.quest_affiliations FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM quests WHERE id = quest_id AND created_by_user_id = auth.uid())
  );

-- Migrate existing guild_id and company_id data into quest_affiliations
INSERT INTO public.quest_affiliations (quest_id, entity_type, entity_id, created_by_user_id)
SELECT id, 'GUILD', guild_id, created_by_user_id
FROM public.quests
WHERE guild_id IS NOT NULL AND is_deleted = false;

INSERT INTO public.quest_affiliations (quest_id, entity_type, entity_id, created_by_user_id)
SELECT id, 'COMPANY', company_id, created_by_user_id
FROM public.quests
WHERE company_id IS NOT NULL AND is_deleted = false;

-- Create indexes
CREATE INDEX idx_quest_affiliations_quest ON public.quest_affiliations(quest_id);
CREATE INDEX idx_quest_affiliations_entity ON public.quest_affiliations(entity_type, entity_id);
