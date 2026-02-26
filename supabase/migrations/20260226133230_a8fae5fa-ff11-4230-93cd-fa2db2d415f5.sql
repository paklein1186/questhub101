
-- Assistant sessions table
CREATE TABLE IF NOT EXISTS public.assistant_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  context_type text NOT NULL,
  context_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assistant_sessions_user_idx
  ON public.assistant_sessions (user_id, context_type, context_id);

-- Assistant messages table
CREATE TABLE IF NOT EXISTS public.assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.assistant_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assistant_messages_session_idx
  ON public.assistant_messages (session_id, created_at);

-- RLS
ALTER TABLE public.assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see/create their own sessions
CREATE POLICY "Users manage own sessions"
  ON public.assistant_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can see/create messages in their own sessions
CREATE POLICY "Users manage own messages"
  ON public.assistant_messages FOR ALL
  USING (session_id IN (SELECT id FROM public.assistant_sessions WHERE user_id = auth.uid()))
  WITH CHECK (session_id IN (SELECT id FROM public.assistant_sessions WHERE user_id = auth.uid()));

-- Validation trigger for role instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_assistant_message_role()
RETURNS trigger AS $$
BEGIN
  IF NEW.role NOT IN ('user', 'assistant', 'system') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be user, assistant, or system.', NEW.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_assistant_message_role
  BEFORE INSERT OR UPDATE ON public.assistant_messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_assistant_message_role();
