-- Drop the table created by the failed migration attempt (if it exists partially)
DROP TABLE IF EXISTS public.quest_hosts CASCADE;

-- Quest Hosts: allows multiple guilds/companies to co-host a quest
CREATE TABLE public.quest_hosts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('GUILD', 'COMPANY')),
  entity_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'CO_HOST' CHECK (role IN ('PRIMARY', 'CO_HOST')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID NOT NULL
);

CREATE UNIQUE INDEX idx_quest_hosts_unique ON public.quest_hosts(quest_id, entity_type, entity_id);
CREATE UNIQUE INDEX idx_quest_hosts_one_primary ON public.quest_hosts(quest_id) WHERE role = 'PRIMARY';
CREATE INDEX idx_quest_hosts_quest ON public.quest_hosts(quest_id);
CREATE INDEX idx_quest_hosts_entity ON public.quest_hosts(entity_type, entity_id);

ALTER TABLE public.quest_hosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quest hosts"
  ON public.quest_hosts FOR SELECT USING (true);

CREATE POLICY "Quest admins can add hosts"
  ON public.quest_hosts FOR INSERT
  WITH CHECK (
    auth.uid() = created_by_user_id
    AND (
      EXISTS (
        SELECT 1 FROM public.quests
        WHERE quests.id = quest_hosts.quest_id
          AND quests.created_by_user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.quest_hosts ph
        JOIN public.guild_members gm ON gm.guild_id = ph.entity_id AND gm.user_id = auth.uid()
        WHERE ph.quest_id = quest_hosts.quest_id
          AND ph.role = 'PRIMARY'
          AND ph.entity_type = 'GUILD'
          AND gm.role = 'ADMIN'
      )
      OR EXISTS (
        SELECT 1 FROM public.quest_hosts ph
        JOIN public.company_members cm ON cm.company_id = ph.entity_id AND cm.user_id = auth.uid()
        WHERE ph.quest_id = quest_hosts.quest_id
          AND ph.role = 'PRIMARY'
          AND ph.entity_type = 'COMPANY'
          AND cm.role IN ('admin', 'owner')
      )
    )
  );

CREATE POLICY "Hosts can be removed by authorized users"
  ON public.quest_hosts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.quests
      WHERE quests.id = quest_hosts.quest_id
        AND quests.created_by_user_id = auth.uid()
    )
    OR (
      quest_hosts.entity_type = 'GUILD'
      AND EXISTS (
        SELECT 1 FROM public.guild_members gm
        WHERE gm.guild_id = quest_hosts.entity_id
          AND gm.user_id = auth.uid()
          AND gm.role = 'ADMIN'
      )
    )
    OR (
      quest_hosts.entity_type = 'COMPANY'
      AND EXISTS (
        SELECT 1 FROM public.company_members cm
        WHERE cm.company_id = quest_hosts.entity_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('admin', 'owner')
      )
    )
  );

-- Migrate existing quests with guild_id
INSERT INTO public.quest_hosts (quest_id, entity_type, entity_id, role, created_by_user_id)
SELECT id, 'GUILD', guild_id, 'PRIMARY', created_by_user_id
FROM public.quests
WHERE guild_id IS NOT NULL AND is_deleted = false
ON CONFLICT DO NOTHING;

-- Migrate existing quests with company_id
INSERT INTO public.quest_hosts (quest_id, entity_type, entity_id, role, created_by_user_id)
SELECT id, 'COMPANY', company_id, 'PRIMARY', created_by_user_id
FROM public.quests
WHERE company_id IS NOT NULL AND guild_id IS NULL AND is_deleted = false
ON CONFLICT DO NOTHING;