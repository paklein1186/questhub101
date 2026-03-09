
-- Add BIOREGION to territory_level enum
ALTER TYPE public.territory_level ADD VALUE IF NOT EXISTS 'BIOREGION';

-- Add created_by_user_id to territories for user-created bioregions
ALTER TABLE public.territories
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create bioregion_members junction table
CREATE TABLE IF NOT EXISTS public.bioregion_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bioregion_id uuid NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  territory_id uuid NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bioregion_id, territory_id)
);

-- Enable RLS
ALTER TABLE public.bioregion_members ENABLE ROW LEVEL SECURITY;

-- RLS: anyone can read
CREATE POLICY "Anyone can read bioregion members"
  ON public.bioregion_members FOR SELECT
  TO authenticated, anon
  USING (true);

-- RLS: creator of the bioregion can manage members
CREATE POLICY "Bioregion creator can insert members"
  ON public.bioregion_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.territories t
      WHERE t.id = bioregion_id
        AND t.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Bioregion creator can delete members"
  ON public.bioregion_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.territories t
      WHERE t.id = bioregion_id
        AND t.created_by_user_id = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_bioregion_members_bioregion ON public.bioregion_members(bioregion_id);
CREATE INDEX IF NOT EXISTS idx_bioregion_members_territory ON public.bioregion_members(territory_id);
