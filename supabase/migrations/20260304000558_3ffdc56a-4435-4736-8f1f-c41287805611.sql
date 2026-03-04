
-- =============================================
-- Pi Cognitive Layer — Core Tables Migration
-- =============================================

-- 1. ALTER pi_conversations: add is_active column
ALTER TABLE public.pi_conversations
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_pi_conversations_user_active
  ON public.pi_conversations (user_id, is_active);

-- 2. CREATE pi_messages
CREATE TABLE public.pi_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.pi_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'pi')),
  content text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pi_messages_conversation ON public.pi_messages (conversation_id, created_at);

ALTER TABLE public.pi_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own conversation messages"
  ON public.pi_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pi_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert own conversation messages"
  ON public.pi_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pi_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete own conversation messages"
  ON public.pi_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.pi_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

-- 3. CREATE pi_memories
CREATE TABLE public.pi_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('short', 'medium', 'long')),
  session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE (user_id, key, tier)
);

CREATE INDEX idx_pi_memories_user_tier ON public.pi_memories (user_id, tier);

ALTER TABLE public.pi_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own memories"
  ON public.pi_memories FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own memories"
  ON public.pi_memories FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own memories"
  ON public.pi_memories FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own memories"
  ON public.pi_memories FOR DELETE
  USING (user_id = auth.uid());

-- 4. CREATE action_cards
CREATE TABLE public.action_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.pi_conversations(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('instant', 'quick_input', 'guided_flow', 'locked', 'background', 'delegation')),
  title text NOT NULL,
  subtitle text,
  description text,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'locked', 'in_progress', 'completed', 'failed')),
  button_label text,
  tool_call text,
  tool_params jsonb,
  xp_reward integer NOT NULL DEFAULT 0,
  trust_reward integer NOT NULL DEFAULT 0,
  estimated_minutes integer,
  unlock_condition text,
  depends_on uuid[],
  priority text NOT NULL DEFAULT 'secondary' CHECK (priority IN ('primary', 'secondary', 'optional')),
  sort_order integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_action_cards_user ON public.action_cards (user_id, status);
CREATE INDEX idx_action_cards_conversation ON public.action_cards (conversation_id);

ALTER TABLE public.action_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own action cards"
  ON public.action_cards FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own action cards"
  ON public.action_cards FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own action cards"
  ON public.action_cards FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own action cards"
  ON public.action_cards FOR DELETE
  USING (user_id = auth.uid());

-- 5. ALTER quest_subtasks: add missing columns
ALTER TABLE public.quest_subtasks
  ADD COLUMN IF NOT EXISTS estimated_minutes integer,
  ADD COLUMN IF NOT EXISTS evidence_url text;

-- 6. CREATE vision_bank
CREATE TABLE public.vision_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vision_text text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  territory_id uuid REFERENCES public.territories(id) ON DELETE SET NULL,
  guild_id uuid REFERENCES public.guilds(id) ON DELETE SET NULL,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('private', 'guild', 'territory', 'public')),
  status text NOT NULL DEFAULT 'seed' CHECK (status IN ('seed', 'sprouting', 'active', 'realized')),
  seasonal_relevance text,
  activated_by uuid,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vision_bank_user ON public.vision_bank (user_id);
CREATE INDEX idx_vision_bank_territory ON public.vision_bank (territory_id) WHERE territory_id IS NOT NULL;
CREATE INDEX idx_vision_bank_guild ON public.vision_bank (guild_id) WHERE guild_id IS NOT NULL;
CREATE INDEX idx_vision_bank_status ON public.vision_bank (status);

ALTER TABLE public.vision_bank ENABLE ROW LEVEL SECURITY;

-- Users see: public visions + their own + visions in their guilds/territories
CREATE POLICY "Users see accessible visions"
  ON public.vision_bank FOR SELECT
  USING (
    visibility = 'public'
    OR user_id = auth.uid()
    OR (visibility = 'guild' AND guild_id IN (
      SELECT gm.guild_id FROM public.guild_members gm WHERE gm.user_id = auth.uid()
    ))
    OR (visibility = 'territory' AND territory_id IN (
      SELECT ut.territory_id FROM public.user_territories ut WHERE ut.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users insert own visions"
  ON public.vision_bank FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own visions"
  ON public.vision_bank FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own visions"
  ON public.vision_bank FOR DELETE
  USING (user_id = auth.uid());

-- 7. CREATE pi_tool_logs
CREATE TABLE public.pi_tool_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.pi_conversations(id) ON DELETE SET NULL,
  tool_name text NOT NULL,
  params jsonb,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pi_tool_logs_conversation ON public.pi_tool_logs (conversation_id);

ALTER TABLE public.pi_tool_logs ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) can write tool logs; users can read their own
CREATE POLICY "Users see own tool logs"
  ON public.pi_tool_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pi_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

-- 8. Trigger: auto-unlock next quest_subtask on completion
CREATE OR REPLACE FUNCTION public.auto_unlock_next_subtask()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.quest_subtasks
    SET status = 'active'
    WHERE quest_id = NEW.quest_id
      AND order_index = NEW.order_index + 1
      AND status = 'locked';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_unlock_next_subtask ON public.quest_subtasks;
CREATE TRIGGER trg_auto_unlock_next_subtask
  AFTER UPDATE ON public.quest_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_unlock_next_subtask();

-- 9. Updated_at trigger for pi_memories
CREATE TRIGGER update_pi_memories_updated_at
  BEFORE UPDATE ON public.pi_memories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
