
-- Create starred_excerpts table
CREATE TABLE public.starred_excerpts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.unit_chat_threads(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.unit_chat_messages(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL,
  excerpt_text TEXT NOT NULL CHECK (length(trim(excerpt_text)) > 0),
  title TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  is_from_agent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_starred_excerpts_thread ON public.starred_excerpts(thread_id);
CREATE INDEX idx_starred_excerpts_user ON public.starred_excerpts(created_by_user_id);
CREATE INDEX idx_starred_excerpts_message ON public.starred_excerpts(message_id);

-- Enable RLS
ALTER TABLE public.starred_excerpts ENABLE ROW LEVEL SECURITY;

-- Members of the unit can view starred excerpts for that thread
-- We check membership by verifying the user can see the thread's entity
CREATE POLICY "Users can view starred excerpts for threads they have access to"
ON public.starred_excerpts
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    -- The user created this excerpt (always visible to creator)
    created_by_user_id = auth.uid()
    -- Or the user is a member of the unit associated with this thread
    OR EXISTS (
      SELECT 1 FROM public.unit_chat_threads t WHERE t.id = thread_id
      AND (
        -- Guild member
        (t.entity_type = 'GUILD' AND EXISTS (SELECT 1 FROM public.guild_members gm WHERE gm.guild_id = t.entity_id AND gm.user_id = auth.uid()))
        -- Quest participant
        OR (t.entity_type = 'QUEST' AND EXISTS (SELECT 1 FROM public.quest_participants qp WHERE qp.quest_id = t.entity_id AND qp.user_id = auth.uid()))
        -- Pod member
        OR (t.entity_type = 'POD' AND EXISTS (SELECT 1 FROM public.pod_members pm WHERE pm.pod_id = t.entity_id AND pm.user_id = auth.uid()))
        -- Company member
        OR (t.entity_type = 'COMPANY' AND EXISTS (SELECT 1 FROM public.company_members cm WHERE cm.company_id = t.entity_id AND cm.user_id = auth.uid()))
        -- For other entity types, allow if user created the excerpt
      )
    )
  )
);

-- Users can create starred excerpts
CREATE POLICY "Users can create starred excerpts"
ON public.starred_excerpts
FOR INSERT
WITH CHECK (auth.uid() = created_by_user_id);

-- Users can update their own starred excerpts
CREATE POLICY "Users can update their own starred excerpts"
ON public.starred_excerpts
FOR UPDATE
USING (auth.uid() = created_by_user_id);

-- Users can delete their own starred excerpts, admins can delete any
CREATE POLICY "Users can delete their own starred excerpts"
ON public.starred_excerpts
FOR DELETE
USING (
  auth.uid() = created_by_user_id
  OR public.has_role(auth.uid(), 'admin')
);
