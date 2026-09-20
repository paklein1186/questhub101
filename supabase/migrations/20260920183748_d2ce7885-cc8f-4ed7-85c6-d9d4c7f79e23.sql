-- Agents: secrets à part, propriétaire (personne / guilde / organisation),
-- fiche détaillée et périmètre thématique × territoire.

-- 1. Secrets dans une table lisible par le seul créateur ------------------
-- Avant : webhook_secret et external_llm_config.api_key_ref vivaient sur la
-- ligne `agents`, lisible par tous pour un agent publié.
CREATE TABLE public.agent_secrets (
  agent_id uuid PRIMARY KEY REFERENCES public.agents(id) ON DELETE CASCADE,
  webhook_secret text,
  llm_api_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators manage own agent secrets"
ON public.agent_secrets FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.creator_user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.creator_user_id = auth.uid()));

-- Reprise d'éventuelles valeurs existantes avant de les retirer de `agents`.
INSERT INTO public.agent_secrets (agent_id, webhook_secret, llm_api_key)
SELECT id, webhook_secret, external_llm_config->>'api_key_ref'
FROM public.agents
WHERE webhook_secret IS NOT NULL OR external_llm_config->>'api_key_ref' IS NOT NULL
ON CONFLICT (agent_id) DO NOTHING;

UPDATE public.agents
SET external_llm_config = external_llm_config - 'api_key_ref'
WHERE external_llm_config->>'api_key_ref' IS NOT NULL;

ALTER TABLE public.agents DROP COLUMN webhook_secret;

-- 2. Propriétaire + fiche détaillée --------------------------------------
ALTER TABLE public.agents
  ADD COLUMN owner_type text NOT NULL DEFAULT 'user',
  ADD COLUMN owner_id uuid,
  ADD COLUMN purpose text,
  ADD COLUMN long_description text,
  ADD COLUMN variables jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.agents
  ADD CONSTRAINT agents_owner_type_check CHECK (owner_type IN ('user', 'guild', 'company'));

UPDATE public.agents SET owner_id = creator_user_id WHERE owner_id IS NULL;

-- 3. Périmètre thématique × territoire ------------------------------------
CREATE TABLE public.agent_topics (
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, topic_id)
);

CREATE TABLE public.agent_territories (
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  territory_id uuid NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, territory_id)
);

ALTER TABLE public.agent_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_territories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scope readable with its agent" ON public.agent_topics FOR SELECT
USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND (a.is_published = true OR a.creator_user_id = auth.uid())));

CREATE POLICY "Creators manage agent topics" ON public.agent_topics FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.creator_user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.creator_user_id = auth.uid()));

CREATE POLICY "Scope readable with its agent" ON public.agent_territories FOR SELECT
USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND (a.is_published = true OR a.creator_user_id = auth.uid())));

CREATE POLICY "Creators manage agent territories" ON public.agent_territories FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.creator_user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.creator_user_id = auth.uid()));