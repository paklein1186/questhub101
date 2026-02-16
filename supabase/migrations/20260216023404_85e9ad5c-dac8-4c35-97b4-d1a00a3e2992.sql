
-- Table to track email invitations to quests for non-registered users
CREATE TABLE public.quest_email_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(quest_id, email)
);

-- Enable RLS
ALTER TABLE public.quest_email_invites ENABLE ROW LEVEL SECURITY;

-- Quest owners can view invites for their quests
CREATE POLICY "Quest owners can view email invites"
  ON public.quest_email_invites FOR SELECT
  USING (
    invited_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.quests WHERE id = quest_id AND created_by_user_id = auth.uid()
    )
  );

-- Quest owners/admins can create invites
CREATE POLICY "Quest owners can create email invites"
  ON public.quest_email_invites FOR INSERT
  WITH CHECK (
    invited_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.quests WHERE id = quest_id AND created_by_user_id = auth.uid()
    )
  );

-- Quest owners can delete invites
CREATE POLICY "Quest owners can delete email invites"
  ON public.quest_email_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.quests WHERE id = quest_id AND created_by_user_id = auth.uid()
    )
  );
