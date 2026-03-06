-- Step 1: Add quest_nature column
ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS quest_nature text DEFAULT 'PROJECT';

-- Step 5: Add check constraint on quest_nature (using validation trigger instead of CHECK for safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quest_nature_valid'
  ) THEN
    ALTER TABLE quests
      ADD CONSTRAINT quest_nature_valid
      CHECK (quest_nature IN (
        'IDEA','PROJECT','MISSION','ACTION','EVENT','LEARNING',
        'SERVICE','RESOURCE','FUNDING','PARTNERSHIP','CONTACT','PLACE'
      ));
  END IF;
END $$;