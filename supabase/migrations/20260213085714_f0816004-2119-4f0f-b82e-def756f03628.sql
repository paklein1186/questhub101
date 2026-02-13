
-- Add cascading FK from guild_members.user_id -> auth.users(id)
ALTER TABLE public.guild_members
  ADD CONSTRAINT guild_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add cascading FK from company_members.user_id -> auth.users(id)
ALTER TABLE public.company_members
  ADD CONSTRAINT company_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add cascading FK from pod_members.user_id -> auth.users(id)
ALTER TABLE public.pod_members
  ADD CONSTRAINT pod_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Clean up any existing orphaned rows (users that no longer exist)
DELETE FROM public.guild_members WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.company_members WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.pod_members WHERE user_id NOT IN (SELECT id FROM auth.users);
