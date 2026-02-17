-- Add a column to track when an item was marked as "today's goal"
-- NULL means not marked; non-null means marked at that timestamp
ALTER TABLE public.user_work_items
ADD COLUMN today_goal_at timestamptz DEFAULT NULL;