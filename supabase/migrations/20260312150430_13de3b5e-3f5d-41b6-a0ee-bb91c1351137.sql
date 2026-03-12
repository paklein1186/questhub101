-- Set default for credit_reward to 0 on quest_subtasks
ALTER TABLE public.quest_subtasks ALTER COLUMN credit_reward SET DEFAULT 0;

-- Update all existing subtasks that have credit_reward = 1 (the old default) to 0
UPDATE public.quest_subtasks SET credit_reward = 0 WHERE credit_reward = 1;