
-- Pi conversations table for persistent chat history
CREATE TABLE public.pi_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  model_id TEXT DEFAULT 'gemini-flash',
  context_type TEXT DEFAULT 'global',
  context_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  messages JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.pi_conversations ENABLE ROW LEVEL SECURITY;

-- Users can only access their own conversations
CREATE POLICY "Users can view own pi conversations"
ON public.pi_conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pi conversations"
ON public.pi_conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pi conversations"
ON public.pi_conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pi conversations"
ON public.pi_conversations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_pi_conversations_user_id ON public.pi_conversations (user_id, updated_at DESC);
