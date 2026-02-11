
-- Territory Excerpts: curated meaningful knowledge excerpts
CREATE TABLE public.territory_excerpts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  source_memory_entry_id UUID REFERENCES public.territory_memory(id) ON DELETE SET NULL,
  source_chat_log_id UUID,
  source_quest_id UUID REFERENCES public.quests(id) ON DELETE SET NULL,
  source_event_id UUID,
  text TEXT NOT NULL,
  created_by_user_id UUID,
  upvote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.territory_excerpts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Territory excerpts are viewable by everyone"
  ON public.territory_excerpts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create territory excerpts"
  ON public.territory_excerpts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own excerpts"
  ON public.territory_excerpts FOR UPDATE
  USING (auth.uid() = created_by_user_id);

CREATE POLICY "Users can delete their own excerpts"
  ON public.territory_excerpts FOR DELETE
  USING (auth.uid() = created_by_user_id);

-- Territory Excerpt Upvotes
CREATE TABLE public.territory_excerpt_upvotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  excerpt_id UUID NOT NULL REFERENCES public.territory_excerpts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(excerpt_id, user_id)
);

ALTER TABLE public.territory_excerpt_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Upvotes are viewable by everyone"
  ON public.territory_excerpt_upvotes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can upvote"
  ON public.territory_excerpt_upvotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own upvote"
  ON public.territory_excerpt_upvotes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update upvote count on territory_excerpts
CREATE OR REPLACE FUNCTION public.update_territory_excerpt_upvotes_count()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.territory_excerpts SET upvote_count = upvote_count + 1 WHERE id = NEW.excerpt_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.territory_excerpts SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id = OLD.excerpt_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_territory_excerpt_upvotes
  AFTER INSERT OR DELETE ON public.territory_excerpt_upvotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_territory_excerpt_upvotes_count();

-- Territory Chat Logs
CREATE TABLE public.territory_chat_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  user_id UUID,
  message_role TEXT NOT NULL CHECK (message_role IN ('USER', 'AI')),
  content TEXT NOT NULL,
  is_knowledge_contribution BOOLEAN NOT NULL DEFAULT false,
  linked_memory_entry_id UUID REFERENCES public.territory_memory(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.territory_chat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat logs are viewable by everyone"
  ON public.territory_chat_logs FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert chat logs"
  ON public.territory_chat_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add summary column to territories table for AI-generated overview
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{}';

-- Indexes
CREATE INDEX idx_territory_excerpts_territory ON public.territory_excerpts(territory_id);
CREATE INDEX idx_territory_excerpt_upvotes_excerpt ON public.territory_excerpt_upvotes(excerpt_id);
CREATE INDEX idx_territory_chat_logs_territory ON public.territory_chat_logs(territory_id);
