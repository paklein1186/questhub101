-- Fix: Remove direct INSERT policy on activity_log table
-- All activity logging is handled by SECURITY DEFINER triggers, so users should not be able to insert arbitrary entries
DROP POLICY IF EXISTS "Users can log their own actions" ON public.activity_log;
