
CREATE TABLE public.ctg_bounties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  action_type text NOT NULL,
  required_count integer NOT NULL DEFAULT 1,
  ctg_reward numeric NOT NULL,
  total_slots integer NOT NULL DEFAULT 50,
  claimed_slots integer NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.ctg_bounty_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id uuid REFERENCES public.ctg_bounties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  claimed_at timestamptz DEFAULT now(),
  verified boolean DEFAULT false,
  verified_at timestamptz,
  UNIQUE(bounty_id, user_id)
);

ALTER TABLE public.ctg_bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctg_bounty_claims ENABLE ROW LEVEL SECURITY;

-- Bounties: anyone can read active bounties
CREATE POLICY "Anyone can read active bounties" ON public.ctg_bounties
  FOR SELECT USING (true);

-- Claims: authenticated users can read their own claims
CREATE POLICY "Users can read own claims" ON public.ctg_bounty_claims
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Claims: authenticated users can insert their own claims
CREATE POLICY "Users can claim bounties" ON public.ctg_bounty_claims
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Admin: full access on bounties (insert/update/delete)
CREATE POLICY "Admins manage bounties" ON public.ctg_bounties
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
