-- Les admins de la guilde propriétaire d'un agent peuvent le modifier
-- (fiche, prix, périmètre, secret) et régler ses paramètres d'usage.
-- « Propriétaire » = agents.owner_type = 'guild' et owner_id = la guilde ;
-- un agent simplement attaché à une guilde reste géré par son créateur.
CREATE OR REPLACE FUNCTION public.can_manage_agent(_agent_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = _agent_id
      AND (
        a.creator_user_id = _user_id
        OR (a.owner_type = 'guild' AND a.owner_id IS NOT NULL AND public.is_guild_admin(a.owner_id, _user_id))
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_agent(uuid, uuid) TO authenticated;

CREATE POLICY "Guild admins view own guild agents" ON public.agents FOR SELECT TO authenticated
USING (public.can_manage_agent(id, auth.uid()));

CREATE POLICY "Guild admins update own guild agents" ON public.agents FOR UPDATE TO authenticated
USING (public.can_manage_agent(id, auth.uid()))
WITH CHECK (public.can_manage_agent(id, auth.uid()));

CREATE POLICY "Managers manage agent secrets" ON public.agent_secrets FOR ALL TO authenticated
USING (public.can_manage_agent(agent_id, auth.uid()))
WITH CHECK (public.can_manage_agent(agent_id, auth.uid()));

CREATE POLICY "Managers manage agent topics" ON public.agent_topics FOR ALL TO authenticated
USING (public.can_manage_agent(agent_id, auth.uid()))
WITH CHECK (public.can_manage_agent(agent_id, auth.uid()));

CREATE POLICY "Managers manage agent territories" ON public.agent_territories FOR ALL TO authenticated
USING (public.can_manage_agent(agent_id, auth.uid()))
WITH CHECK (public.can_manage_agent(agent_id, auth.uid()));

-- Réglages d'attachement (ex. « gratuit pour ») : réservés à ceux qui gèrent
-- l'agent — l'admin d'une guilde simple utilisatrice ne peut pas rendre gratuit
-- l'agent d'un autre.
CREATE POLICY "Managers update unit agents" ON public.unit_agents FOR UPDATE TO authenticated
USING (public.can_manage_agent(agent_id, auth.uid()))
WITH CHECK (public.can_manage_agent(agent_id, auth.uid()));