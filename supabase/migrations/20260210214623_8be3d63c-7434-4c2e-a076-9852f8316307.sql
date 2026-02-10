
-- Extend quests with credit budget and escrow fields
ALTER TABLE public.quests
ADD COLUMN IF NOT EXISTS credit_budget INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS escrow_credits INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS allow_fundraising BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS funding_goal_credits INTEGER;

-- Update quest_status enum to add new statuses
ALTER TYPE public.quest_status ADD VALUE IF NOT EXISTS 'OPEN_FOR_PROPOSALS';
ALTER TYPE public.quest_status ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE public.quest_status ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE public.quest_status ADD VALUE IF NOT EXISTS 'DRAFT';

-- Quest Proposals table
CREATE TABLE IF NOT EXISTS public.quest_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  proposer_type TEXT NOT NULL DEFAULT 'USER',
  proposer_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  requested_credits INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  upvotes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quest_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Proposals viewable by everyone" ON public.quest_proposals FOR SELECT USING (true);
CREATE POLICY "Users can create proposals" ON public.quest_proposals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Proposers can update own proposals" ON public.quest_proposals FOR UPDATE USING (
  proposer_type = 'USER' AND proposer_id = auth.uid()::text
);
CREATE POLICY "Quest owners can update proposals" ON public.quest_proposals FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.quests WHERE id = quest_proposals.quest_id AND created_by_user_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_quest_proposals_quest ON public.quest_proposals(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_proposals_proposer ON public.quest_proposals(proposer_type, proposer_id);

-- Quest Proposal Upvotes table
CREATE TABLE IF NOT EXISTS public.quest_proposal_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.quest_proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(proposal_id, user_id)
);

ALTER TABLE public.quest_proposal_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Upvotes viewable by everyone" ON public.quest_proposal_upvotes FOR SELECT USING (true);
CREATE POLICY "Users can upvote proposals" ON public.quest_proposal_upvotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own upvotes" ON public.quest_proposal_upvotes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_proposal_upvotes_proposal ON public.quest_proposal_upvotes(proposal_id);

-- Quest Funding table
CREATE TABLE IF NOT EXISTS public.quest_funding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  funder_user_id UUID,
  type TEXT NOT NULL DEFAULT 'CREDITS',
  amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'PAID',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quest_funding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Funding viewable by everyone" ON public.quest_funding FOR SELECT USING (true);
CREATE POLICY "Users can fund quests" ON public.quest_funding FOR INSERT WITH CHECK (auth.uid() = funder_user_id);
CREATE POLICY "Quest owner or funder can update funding" ON public.quest_funding FOR UPDATE USING (
  auth.uid() = funder_user_id OR EXISTS (SELECT 1 FROM public.quests WHERE id = quest_funding.quest_id AND created_by_user_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_quest_funding_quest ON public.quest_funding(quest_id);
