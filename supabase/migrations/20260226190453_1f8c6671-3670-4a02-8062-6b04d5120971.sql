
-- =============================================
-- PROOF-OF-CONTRIBUTION SYSTEM
-- =============================================

-- 1. Add credit_reward field to quest_subtasks for micro-payouts
ALTER TABLE public.quest_subtasks
  ADD COLUMN IF NOT EXISTS credit_reward INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by_user_id UUID;

-- 2. Create contribution_logs table (immutable ledger)
CREATE TABLE public.contribution_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quest_id UUID REFERENCES public.quests(id) ON DELETE SET NULL,
  subtask_id UUID REFERENCES public.quest_subtasks(id) ON DELETE SET NULL,
  guild_id UUID REFERENCES public.guilds(id) ON DELETE SET NULL,
  territory_id UUID REFERENCES public.territories(id) ON DELETE SET NULL,
  
  -- What they did
  contribution_type TEXT NOT NULL DEFAULT 'subtask_completed',
  -- Allowed: subtask_completed, quest_completed, proposal_accepted, review_given,
  --          ritual_participation, documentation, mentorship, governance_vote,
  --          ecological_annotation, insight, debugging, other
  
  role TEXT,                          -- contributor role in context
  title TEXT NOT NULL,                -- human-readable summary
  description TEXT,                   -- details of what was done
  deliverable_url TEXT,               -- optional link to deliverable
  
  -- Value signals
  xp_earned INTEGER NOT NULL DEFAULT 0,
  credits_earned INTEGER NOT NULL DEFAULT 0,
  trust_signal JSONB,                 -- e.g. {"timeliness": 1, "quality": 1, "collaboration": 1}
  impact_signal JSONB,                -- e.g. {"ecological": 0.5, "social": 0.3}
  
  -- Attribution
  ip_licence TEXT NOT NULL DEFAULT 'CC-BY-SA',
  hours_logged NUMERIC(6,2),          -- optional hours
  
  -- Metadata
  verified_by_user_id UUID,           -- who verified/accepted
  verified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'logged',  -- logged, verified, disputed
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contribution_logs ENABLE ROW LEVEL SECURITY;

-- Everyone can view contribution logs (transparency)
CREATE POLICY "Contribution logs viewable by everyone"
  ON public.contribution_logs FOR SELECT USING (true);

-- Users can insert their own contributions
CREATE POLICY "Users can log own contributions"
  ON public.contribution_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only the user or quest owner can update (for verification)
CREATE POLICY "User or verifier can update contributions"
  ON public.contribution_logs FOR UPDATE
  USING (
    auth.uid() = user_id
    OR auth.uid() = verified_by_user_id
    OR EXISTS (
      SELECT 1 FROM quests WHERE quests.id = contribution_logs.quest_id
      AND quests.created_by_user_id = auth.uid()
    )
  );

-- No deletes (immutable ledger)
-- (no DELETE policy = no one can delete)

-- 3. Create index for fast lookups
CREATE INDEX idx_contribution_logs_user ON public.contribution_logs(user_id);
CREATE INDEX idx_contribution_logs_quest ON public.contribution_logs(quest_id);
CREATE INDEX idx_contribution_logs_subtask ON public.contribution_logs(subtask_id);
CREATE INDEX idx_contribution_logs_type ON public.contribution_logs(contribution_type);

-- 4. Trigger: auto-log contribution when subtask is marked DONE
CREATE OR REPLACE FUNCTION public.log_subtask_contribution()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  _quest RECORD;
  _user_id UUID;
BEGIN
  -- Only fire when status changes TO 'DONE'
  IF NEW.status = 'DONE' AND (OLD.status IS NULL OR OLD.status <> 'DONE') THEN
    _user_id := COALESCE(NEW.assignee_user_id, auth.uid());
    
    -- Get quest context
    SELECT q.id, q.guild_id, qt.territory_id
    INTO _quest
    FROM quests q
    LEFT JOIN quest_territories qt ON qt.quest_id = q.id AND qt.is_primary = true
    WHERE q.id = NEW.quest_id;
    
    -- Set completed metadata
    NEW.completed_at := now();
    NEW.completed_by_user_id := _user_id;
    
    -- Insert contribution log
    INSERT INTO contribution_logs (
      user_id, quest_id, subtask_id, guild_id, territory_id,
      contribution_type, title, description,
      xp_earned, credits_earned,
      ip_licence, status
    ) VALUES (
      _user_id,
      NEW.quest_id,
      NEW.id,
      _quest.guild_id,
      _quest.territory_id,
      'subtask_completed',
      'Completed: ' || NEW.title,
      NEW.description,
      COALESCE(NEW.xp_reward, 0),
      COALESCE(NEW.credit_reward, 0),
      'CC-BY-SA',
      'logged'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_subtask_contribution
  BEFORE UPDATE ON public.quest_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_subtask_contribution();

-- 5. Also trigger on quest completion for the creator
CREATE OR REPLACE FUNCTION public.log_quest_completion_contribution()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  _territory_id UUID;
BEGIN
  -- Only fire when status changes TO 'COMPLETED'
  IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status <> 'COMPLETED') THEN
    SELECT qt.territory_id INTO _territory_id
    FROM quest_territories qt
    WHERE qt.quest_id = NEW.id AND qt.is_primary = true
    LIMIT 1;
    
    -- Log for the quest creator
    INSERT INTO contribution_logs (
      user_id, quest_id, guild_id, territory_id,
      contribution_type, title, description,
      xp_earned, credits_earned,
      ip_licence, status
    ) VALUES (
      NEW.created_by_user_id,
      NEW.id,
      NEW.guild_id,
      _territory_id,
      'quest_completed',
      'Quest completed: ' || NEW.title,
      NEW.description,
      0, -- XP granted separately via existing system
      0, -- Credits handled via existing escrow
      'CC-BY-SA',
      'logged'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_quest_completion_contribution
  AFTER UPDATE ON public.quests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_quest_completion_contribution();

-- 6. Enable realtime for contribution_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.contribution_logs;
