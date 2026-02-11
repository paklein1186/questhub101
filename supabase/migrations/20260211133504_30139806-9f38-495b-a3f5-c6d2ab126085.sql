
-- Attach the existing trigger function to profiles table
-- so new users get notification preferences automatically
CREATE OR REPLACE TRIGGER create_notification_prefs_on_profile
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_default_notification_preferences();

-- Backfill notification_preferences for ALL existing users who are missing them
INSERT INTO public.notification_preferences (user_id)
SELECT p.user_id FROM public.profiles p
LEFT JOIN public.notification_preferences np ON np.user_id = p.user_id
WHERE np.id IS NULL
ON CONFLICT (user_id) DO NOTHING;
