
-- Create partnerships table
CREATE TABLE public.partnerships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_entity_type TEXT NOT NULL CHECK (from_entity_type IN ('GUILD', 'COMPANY')),
  from_entity_id UUID NOT NULL,
  to_entity_type TEXT NOT NULL CHECK (to_entity_type IN ('GUILD', 'COMPANY')),
  to_entity_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED')),
  partnership_type TEXT DEFAULT 'ALLY',
  notes TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Prevent duplicate active partnerships between same pair
CREATE UNIQUE INDEX idx_partnerships_unique_active
  ON public.partnerships (
    LEAST(from_entity_type || ':' || from_entity_id::text, to_entity_type || ':' || to_entity_id::text),
    GREATEST(from_entity_type || ':' || from_entity_id::text, to_entity_type || ':' || to_entity_id::text)
  )
  WHERE status IN ('PENDING', 'ACCEPTED');

-- Indexes for lookups
CREATE INDEX idx_partnerships_from ON public.partnerships (from_entity_type, from_entity_id);
CREATE INDEX idx_partnerships_to ON public.partnerships (to_entity_type, to_entity_id);
CREATE INDEX idx_partnerships_status ON public.partnerships (status);

-- Enable RLS
ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view accepted partnerships (public display)
CREATE POLICY "Anyone can view accepted partnerships"
  ON public.partnerships FOR SELECT
  USING (
    status = 'ACCEPTED'
    OR
    -- Admins of involved entities can see all statuses
    EXISTS (
      SELECT 1 FROM guild_members gm
      WHERE gm.user_id = auth.uid() AND gm.role = 'ADMIN'
      AND (
        (from_entity_type = 'GUILD' AND gm.guild_id = from_entity_id)
        OR (to_entity_type = 'GUILD' AND gm.guild_id = to_entity_id)
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.user_id = auth.uid() AND cm.role IN ('admin', 'owner', 'ADMIN')
      AND (
        (from_entity_type = 'COMPANY' AND cm.company_id = from_entity_id)
        OR (to_entity_type = 'COMPANY' AND cm.company_id = to_entity_id)
      )
    )
  );

-- Only entity admins can create partnerships
CREATE POLICY "Entity admins can create partnerships"
  ON public.partnerships FOR INSERT
  WITH CHECK (
    auth.uid() = created_by_user_id
    AND (
      (from_entity_type = 'GUILD' AND EXISTS (
        SELECT 1 FROM guild_members gm WHERE gm.user_id = auth.uid() AND gm.guild_id = from_entity_id AND gm.role = 'ADMIN'
      ))
      OR
      (from_entity_type = 'COMPANY' AND EXISTS (
        SELECT 1 FROM company_members cm WHERE cm.user_id = auth.uid() AND cm.company_id = from_entity_id AND cm.role IN ('admin', 'owner', 'ADMIN')
      ))
    )
  );

-- Only admins of involved entities can update partnerships
CREATE POLICY "Entity admins can update partnerships"
  ON public.partnerships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      WHERE gm.user_id = auth.uid() AND gm.role = 'ADMIN'
      AND (
        (from_entity_type = 'GUILD' AND gm.guild_id = from_entity_id)
        OR (to_entity_type = 'GUILD' AND gm.guild_id = to_entity_id)
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.user_id = auth.uid() AND cm.role IN ('admin', 'owner', 'ADMIN')
      AND (
        (from_entity_type = 'COMPANY' AND cm.company_id = from_entity_id)
        OR (to_entity_type = 'COMPANY' AND cm.company_id = to_entity_id)
      )
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_partnerships_updated_at
  BEFORE UPDATE ON public.partnerships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
