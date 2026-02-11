
-- Territory Memory entries
CREATE TABLE public.territory_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'RAW_NOTES',
  visibility TEXT NOT NULL DEFAULT 'PUBLIC',
  tags TEXT[] DEFAULT '{}',
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_territory_memory_territory ON public.territory_memory(territory_id);
CREATE INDEX idx_territory_memory_category ON public.territory_memory(category);
CREATE INDEX idx_territory_memory_visibility ON public.territory_memory(visibility);

ALTER TABLE public.territory_memory ENABLE ROW LEVEL SECURITY;

-- Everyone can read PUBLIC entries
CREATE POLICY "Anyone can read public territory memory"
ON public.territory_memory FOR SELECT
USING (visibility = 'PUBLIC');

-- Territory members can read ADMINS visibility entries
CREATE POLICY "Territory members can read admin memory"
ON public.territory_memory FOR SELECT TO authenticated
USING (
  visibility = 'ADMINS'
  AND EXISTS (
    SELECT 1 FROM public.user_territories ut
    WHERE ut.territory_id = territory_memory.territory_id
    AND ut.user_id = auth.uid()
  )
);

-- Platform admins can read all
CREATE POLICY "Platform admins can read all memory"
ON public.territory_memory FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Territory members can insert
CREATE POLICY "Territory members can add memory"
ON public.territory_memory FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by_user_id
  AND EXISTS (
    SELECT 1 FROM public.user_territories ut
    WHERE ut.territory_id = territory_memory.territory_id
    AND ut.user_id = auth.uid()
  )
);

-- Creator or platform admin can update
CREATE POLICY "Creator or admin can update memory"
ON public.territory_memory FOR UPDATE TO authenticated
USING (
  auth.uid() = created_by_user_id
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  auth.uid() = created_by_user_id
  OR public.has_role(auth.uid(), 'admin')
);

-- Creator or platform admin can delete
CREATE POLICY "Creator or admin can delete memory"
ON public.territory_memory FOR DELETE TO authenticated
USING (
  auth.uid() = created_by_user_id
  OR public.has_role(auth.uid(), 'admin')
);

-- Trigger for updated_at
CREATE TRIGGER update_territory_memory_updated_at
BEFORE UPDATE ON public.territory_memory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
