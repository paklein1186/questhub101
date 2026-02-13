
-- Add column to notification_preferences for DM email notifications
ALTER TABLE public.notification_preferences
ADD COLUMN notify_direct_messages_email boolean DEFAULT true;
