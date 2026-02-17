
-- Fix 1: Make dm-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'dm-attachments';

-- Fix 2: Drop the public SELECT policy on dm-attachments and replace with authenticated-only signed URL access
DROP POLICY IF EXISTS "Anyone can view DM attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view dm attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public dm-attachments read" ON storage.objects;

-- Keep upload/delete policies as-is (they already check auth.uid())

-- Fix 3: Drop the permissive SELECT policy on calendar_connections to prevent direct token access
-- Users must use get_my_calendar_connections() RPC instead
DROP POLICY IF EXISTS "Users can view their own calendar connections" ON public.calendar_connections;
DROP POLICY IF EXISTS "Users can read own calendar connections" ON public.calendar_connections;
