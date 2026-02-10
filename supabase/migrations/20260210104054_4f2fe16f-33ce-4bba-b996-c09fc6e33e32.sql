
-- Add join policy and application questions to pods
ALTER TABLE public.pods
  ADD COLUMN join_policy public.guild_join_policy NOT NULL DEFAULT 'OPEN',
  ADD COLUMN application_questions jsonb DEFAULT '[]'::jsonb;

-- Create pod_applications table
CREATE TABLE public.pod_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id uuid NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  applicant_user_id uuid NOT NULL,
  status public.guild_application_status NOT NULL DEFAULT 'PENDING',
  answers jsonb DEFAULT '[]'::jsonb,
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_pod_applications_pending_unique
  ON public.pod_applications (pod_id, applicant_user_id)
  WHERE status = 'PENDING';

ALTER TABLE public.pod_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pod applications"
  ON public.pod_applications FOR SELECT
  USING (auth.uid() = applicant_user_id);

CREATE POLICY "Pod admins can view pod applications"
  ON public.pod_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pod_members
      WHERE pod_members.pod_id = pod_applications.pod_id
        AND pod_members.user_id = auth.uid()
        AND pod_members.role = 'HOST'
    )
  );

CREATE POLICY "Users can submit pod applications"
  ON public.pod_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_user_id);

CREATE POLICY "Pod admins can update pod applications"
  ON public.pod_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.pod_members
      WHERE pod_members.pod_id = pod_applications.pod_id
        AND pod_members.user_id = auth.uid()
        AND pod_members.role = 'HOST'
    )
  );

CREATE TRIGGER update_pod_applications_updated_at
  BEFORE UPDATE ON public.pod_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create company_members table
CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'MEMBER',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members are viewable by everyone"
  ON public.company_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join companies"
  ON public.company_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can leave or admins can manage"
  ON public.company_members FOR DELETE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Create company_applications table  
CREATE TABLE public.company_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  applicant_user_id uuid NOT NULL,
  status public.guild_application_status NOT NULL DEFAULT 'PENDING',
  answers jsonb DEFAULT '[]'::jsonb,
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_company_applications_pending_unique
  ON public.company_applications (company_id, applicant_user_id)
  WHERE status = 'PENDING';

ALTER TABLE public.company_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company applications"
  ON public.company_applications FOR SELECT
  USING (auth.uid() = applicant_user_id);

CREATE POLICY "Company admins can view company applications"
  ON public.company_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = company_applications.company_id
        AND company_members.user_id = auth.uid()
        AND company_members.role = 'ADMIN'
    )
  );

CREATE POLICY "Users can submit company applications"
  ON public.company_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_user_id);

CREATE POLICY "Company admins can update company applications"
  ON public.company_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = company_applications.company_id
        AND company_members.user_id = auth.uid()
        AND company_members.role = 'ADMIN'
    )
  );

CREATE TRIGGER update_company_applications_updated_at
  BEFORE UPDATE ON public.company_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
