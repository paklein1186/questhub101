
ALTER TABLE public.quest_updates
  ADD COLUMN IF NOT EXISTS posted_as_entity_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS posted_as_entity_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS posted_as_label text DEFAULT NULL;

ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS posted_as_entity_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS posted_as_entity_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS posted_as_label text DEFAULT NULL;
