
-- Create notification_preferences table for per-user granular notification settings
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  
  -- Global channel toggles
  channel_in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  channel_email_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Superadmin categories (only relevant if user is superadmin)
  notify_system_errors BOOLEAN NOT NULL DEFAULT true,
  notify_new_user_registrations BOOLEAN NOT NULL DEFAULT true,
  notify_new_bug_reports BOOLEAN NOT NULL DEFAULT true,
  notify_payments_and_shares BOOLEAN NOT NULL DEFAULT true,
  notify_abuse_reports BOOLEAN NOT NULL DEFAULT true,
  
  -- Unit admin categories (relevant if user is admin of any entity)
  notify_new_join_requests_guilds BOOLEAN NOT NULL DEFAULT true,
  notify_new_join_requests_pods BOOLEAN NOT NULL DEFAULT true,
  notify_new_partnership_requests BOOLEAN NOT NULL DEFAULT true,
  notify_quest_updates_and_comments BOOLEAN NOT NULL DEFAULT true,
  notify_bookings_and_cancellations BOOLEAN NOT NULL DEFAULT true,
  notify_co_host_changes BOOLEAN NOT NULL DEFAULT true,
  notify_events_and_courses BOOLEAN NOT NULL DEFAULT true,
  notify_ai_flagged_content BOOLEAN NOT NULL DEFAULT true,
  
  -- User personal categories
  notify_booking_status_changes BOOLEAN NOT NULL DEFAULT true,
  notify_quest_updates_from_followed BOOLEAN NOT NULL DEFAULT true,
  notify_invitations_to_units BOOLEAN NOT NULL DEFAULT true,
  notify_comments_and_upvotes BOOLEAN NOT NULL DEFAULT true,
  notify_follower_activity BOOLEAN NOT NULL DEFAULT true,
  notify_xp_and_achievements BOOLEAN NOT NULL DEFAULT true,
  
  -- Delivery frequency
  notification_frequency TEXT NOT NULL DEFAULT 'INSTANT',
  push_enabled BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create default preferences on new user registration
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created_notification_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_preferences();
