
-- Add join policy enum
CREATE TYPE public.guild_join_policy AS ENUM ('OPEN', 'APPROVAL_REQUIRED', 'INVITE_ONLY');

-- Add join policy and application questions to guilds table
ALTER TABLE public.guilds
  ADD COLUMN join_policy public.guild_join_policy NOT NULL DEFAULT 'OPEN',
  ADD COLUMN application_questions jsonb DEFAULT '[]'::jsonb;

-- Add guild application status enum
CREATE TYPE public.guild_application_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Create guild_applications table
CREATE TABLE public.guild_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  applicant_user_id uuid NOT NULL,
  status public.guild_application_status NOT NULL DEFAULT 'PENDING',
  answers jsonb DEFAULT '[]'::jsonb,
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only one pending application per (guild, user)
CREATE UNIQUE INDEX idx_guild_applications_pending_unique
  ON public.guild_applications (guild_id, applicant_user_id)
  WHERE status = 'PENDING';

-- Enable RLS
ALTER TABLE public.guild_applications ENABLE ROW LEVEL SECURITY;

-- Applicants can view their own applications
CREATE POLICY "Users can view own applications"
  ON public.guild_applications FOR SELECT
  USING (auth.uid() = applicant_user_id);

-- Guild admins can view applications for their guild
CREATE POLICY "Guild admins can view applications"
  ON public.guild_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_members
      WHERE guild_members.guild_id = guild_applications.guild_id
        AND guild_members.user_id = auth.uid()
        AND guild_members.role = 'ADMIN'
    )
  );

-- Authenticated users can submit applications
CREATE POLICY "Users can submit applications"
  ON public.guild_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_user_id);

-- Guild admins can update applications (approve/reject)
CREATE POLICY "Guild admins can update applications"
  ON public.guild_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_members
      WHERE guild_members.guild_id = guild_applications.guild_id
        AND guild_members.user_id = auth.uid()
        AND guild_members.role = 'ADMIN'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_guild_applications_updated_at
  BEFORE UPDATE ON public.guild_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
