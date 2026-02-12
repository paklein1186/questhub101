
-- Personal tasks ("flying" tasks not yet linked to quests)
CREATE TABLE public.personal_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'TODO',
  due_date DATE,
  converted_to_quest_id UUID REFERENCES public.quests(id) ON DELETE SET NULL,
  converted_to_subtask_id UUID REFERENCES public.quest_subtasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personal_tasks ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own tasks
CREATE POLICY "Users can view their own tasks"
ON public.personal_tasks FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
ON public.personal_tasks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
ON public.personal_tasks FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
ON public.personal_tasks FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_personal_tasks_updated_at
BEFORE UPDATE ON public.personal_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast user lookups
CREATE INDEX idx_personal_tasks_user_id ON public.personal_tasks(user_id);
CREATE INDEX idx_personal_tasks_status ON public.personal_tasks(user_id, status);
