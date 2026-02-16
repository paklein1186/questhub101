
-- Add broader notification preference columns for followed activity
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS notify_new_posts_from_followed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_new_events_from_followed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_new_services_from_followed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_new_courses_from_followed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_new_quests_from_followed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_direct_messages_in_app boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_entity_updates_from_followed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_new_members_in_my_units boolean NOT NULL DEFAULT true;
