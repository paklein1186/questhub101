
-- Function to look up user ID by email (used by invite edge function)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(lookup_email TEXT)
RETURNS TABLE(id UUID) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT au.id FROM auth.users au WHERE au.email = lower(trim(lookup_email)) LIMIT 1;
$$;
