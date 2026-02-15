-- Add priority column to personal_tasks
ALTER TABLE public.personal_tasks
ADD COLUMN priority text NOT NULL DEFAULT 'NONE';

-- Add priority column to quest_subtasks
ALTER TABLE public.quest_subtasks
ADD COLUMN priority text NOT NULL DEFAULT 'NONE';
