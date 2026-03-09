
CREATE TABLE public.harvest_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  multiplier numeric NOT NULL DEFAULT 1.5,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.harvest_windows ENABLE ROW LEVEL SECURITY;

-- Anyone can read active harvest windows
CREATE POLICY "Anyone can read harvest windows" ON public.harvest_windows
  FOR SELECT USING (true);

-- Admins manage harvest windows
CREATE POLICY "Admins manage harvest windows" ON public.harvest_windows
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
