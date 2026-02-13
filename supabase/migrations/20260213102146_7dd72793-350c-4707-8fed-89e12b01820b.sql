
-- Junction table for personal task assignees
CREATE TABLE public.task_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.personal_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Enable RLS
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- Policy: task owner can manage assignees
CREATE POLICY "Task owner can view assignees"
ON public.task_assignees FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.personal_tasks pt
    WHERE pt.id = task_id AND pt.user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Task owner can insert assignees"
ON public.task_assignees FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.personal_tasks pt
    WHERE pt.id = task_id AND pt.user_id = auth.uid()
  )
);

CREATE POLICY "Task owner can delete assignees"
ON public.task_assignees FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.personal_tasks pt
    WHERE pt.id = task_id AND pt.user_id = auth.uid()
  )
);

-- Index for fast lookups
CREATE INDEX idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX idx_task_assignees_user_id ON public.task_assignees(user_id);
