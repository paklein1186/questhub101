
-- Add unique constraint to prevent duplicate follows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'follows_unique_follower_target'
  ) THEN
    ALTER TABLE public.follows
      ADD CONSTRAINT follows_unique_follower_target UNIQUE (follower_id, target_type, target_id);
  END IF;
END $$;
