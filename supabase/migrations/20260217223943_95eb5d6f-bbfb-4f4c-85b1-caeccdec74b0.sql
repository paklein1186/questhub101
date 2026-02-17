
-- Add quest_id to rituals table so rituals can belong to quests too
ALTER TABLE public.rituals ADD COLUMN IF NOT EXISTS quest_id uuid REFERENCES public.quests(id) ON DELETE CASCADE;

-- Create index for quest rituals lookup
CREATE INDEX IF NOT EXISTS idx_rituals_quest_id ON public.rituals(quest_id);

-- Allow members to read rituals associated with quests they participate in
CREATE POLICY "Quest participants can view quest rituals"
  ON public.rituals FOR SELECT
  USING (
    quest_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.quest_participants
        WHERE quest_participants.quest_id = rituals.quest_id
        AND quest_participants.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.quests
        WHERE quests.id = rituals.quest_id
        AND quests.created_by_user_id = auth.uid()
      )
    )
  );

-- Allow quest owners to create rituals for their quests
CREATE POLICY "Quest owners can create quest rituals"
  ON public.rituals FOR INSERT
  WITH CHECK (
    quest_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.quests
      WHERE quests.id = rituals.quest_id
      AND quests.created_by_user_id = auth.uid()
    )
  );

-- Quest participants can view occurrences for quest rituals
CREATE POLICY "Quest participants can view quest ritual occurrences"
  ON public.ritual_occurrences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rituals r
      JOIN public.quest_participants qp ON qp.quest_id = r.quest_id
      WHERE r.id = ritual_occurrences.ritual_id
      AND r.quest_id IS NOT NULL
      AND qp.user_id = auth.uid()
    )
  );

-- Quest participants can RSVP to quest ritual occurrences
CREATE POLICY "Quest participants can attend quest ritual occurrences"
  ON public.ritual_attendees FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.ritual_occurrences ro
      JOIN public.rituals r ON r.id = ro.ritual_id
      JOIN public.quest_participants qp ON qp.quest_id = r.quest_id
      WHERE ro.id = ritual_attendees.occurrence_id
      AND r.quest_id IS NOT NULL
      AND qp.user_id = auth.uid()
    )
  );
