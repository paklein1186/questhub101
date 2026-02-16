
-- Custom roles that can be defined per entity (guild, company, pod)
CREATE TABLE public.entity_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('guild', 'company', 'pod')),
  entity_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assignment of roles to members (many-to-many)
CREATE TABLE public.entity_member_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_role_id UUID NOT NULL REFERENCES public.entity_roles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_role_id, user_id)
);

-- Indexes
CREATE INDEX idx_entity_roles_entity ON public.entity_roles(entity_type, entity_id);
CREATE INDEX idx_entity_member_roles_user ON public.entity_member_roles(user_id);
CREATE INDEX idx_entity_member_roles_role ON public.entity_member_roles(entity_role_id);

-- RLS
ALTER TABLE public.entity_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_member_roles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read roles
CREATE POLICY "Anyone can read entity roles"
  ON public.entity_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can read member roles"
  ON public.entity_member_roles FOR SELECT TO authenticated USING (true);

-- Admins of the entity can manage roles
CREATE POLICY "Entity admins can manage entity roles"
  ON public.entity_roles FOR ALL TO authenticated
  USING (
    (entity_type = 'guild' AND EXISTS (
      SELECT 1 FROM public.guild_members gm
      WHERE gm.guild_id = entity_roles.entity_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
    ))
    OR (entity_type = 'company' AND EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = entity_roles.entity_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'owner')
    ))
    OR (entity_type = 'pod' AND EXISTS (
      SELECT 1 FROM public.pod_members pm
      WHERE pm.pod_id = entity_roles.entity_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'HOST'
    ))
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    (entity_type = 'guild' AND EXISTS (
      SELECT 1 FROM public.guild_members gm
      WHERE gm.guild_id = entity_roles.entity_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
    ))
    OR (entity_type = 'company' AND EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = entity_roles.entity_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'owner')
    ))
    OR (entity_type = 'pod' AND EXISTS (
      SELECT 1 FROM public.pod_members pm
      WHERE pm.pod_id = entity_roles.entity_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'HOST'
    ))
    OR public.has_role(auth.uid(), 'admin')
  );

-- Entity admins can manage member role assignments
CREATE POLICY "Entity admins can manage member roles"
  ON public.entity_member_roles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.entity_roles er
      WHERE er.id = entity_member_roles.entity_role_id
        AND (
          (er.entity_type = 'guild' AND EXISTS (
            SELECT 1 FROM public.guild_members gm
            WHERE gm.guild_id = er.entity_id AND gm.user_id = auth.uid() AND gm.role = 'ADMIN'
          ))
          OR (er.entity_type = 'company' AND EXISTS (
            SELECT 1 FROM public.company_members cm
            WHERE cm.company_id = er.entity_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'owner')
          ))
          OR (er.entity_type = 'pod' AND EXISTS (
            SELECT 1 FROM public.pod_members pm
            WHERE pm.pod_id = er.entity_id AND pm.user_id = auth.uid() AND pm.role = 'HOST'
          ))
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entity_roles er
      WHERE er.id = entity_member_roles.entity_role_id
        AND (
          (er.entity_type = 'guild' AND EXISTS (
            SELECT 1 FROM public.guild_members gm
            WHERE gm.guild_id = er.entity_id AND gm.user_id = auth.uid() AND gm.role = 'ADMIN'
          ))
          OR (er.entity_type = 'company' AND EXISTS (
            SELECT 1 FROM public.company_members cm
            WHERE cm.company_id = er.entity_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'owner')
          ))
          OR (er.entity_type = 'pod' AND EXISTS (
            SELECT 1 FROM public.pod_members pm
            WHERE pm.pod_id = er.entity_id AND pm.user_id = auth.uid() AND pm.role = 'HOST'
          ))
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );
