
-- Create user_work_items table for decoupled task perspective
CREATE TABLE public.user_work_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('personal_task', 'quest', 'quest_subtask')),
  entity_id UUID NOT NULL,
  work_state TEXT NOT NULL DEFAULT 'BACKLOG' CHECK (work_state IN ('BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);

-- Enable RLS
ALTER TABLE public.user_work_items ENABLE ROW LEVEL SECURITY;

-- Users can manage their own work items
CREATE POLICY "Users can view their own work items"
  ON public.user_work_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own work items"
  ON public.user_work_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own work items"
  ON public.user_work_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own work items"
  ON public.user_work_items FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_work_items_updated_at
  BEFORE UPDATE ON public.user_work_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Reset all personal_tasks status to BACKLOG
UPDATE public.personal_tasks SET status = 'BACKLOG';

-- Reset all quest_subtasks status to BACKLOG  
UPDATE public.quest_subtasks SET status = 'BACKLOG';

-- Delete any existing user_work_items (clean slate)
-- (Table is new, but just in case)
DELETE FROM public.user_work_items;
