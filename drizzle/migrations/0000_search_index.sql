-- Index de recherche sémantique de toute la plateforme (guildes, quêtes, entités, pods, services, cours,
-- agents, territoires, thèmes, profils). Alimenté par la fonction search-index-sync, interrogé par Pi.
-- Jamais lisible directement par les utilisateurs : seul le service y accède ; les droits de chaque
-- élément (public / membres / privé) sont appliqués par les fonctions de recherche ci-dessous.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.search_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  url text NOT NULL,
  audience text NOT NULL DEFAULT 'public' CHECK (audience IN ('public', 'members', 'private')),
  topics text[] NOT NULL DEFAULT '{}',
  territories text[] NOT NULL DEFAULT '{}',
  content_hash text NOT NULL,
  embedding vector(1536),
  source_updated_at timestamptz,
  indexed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);

CREATE INDEX idx_search_index_type ON public.search_index (entity_type);
CREATE INDEX idx_search_index_embedding ON public.search_index USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.search_index ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.search_index FROM anon, authenticated;
GRANT ALL ON public.search_index TO service_role;

-- audience : public = tout le monde ; members = tout compte connecté ; private = seulement les
-- éléments dont la clé « type:id » figure dans p_allowed_keys (ses guildes, quêtes, entités, pods…).
CREATE OR REPLACE FUNCTION public.match_search_index(
  p_query_embedding vector(1536),
  p_match_count integer DEFAULT 10,
  p_types text[] DEFAULT NULL,
  p_allowed_keys text[] DEFAULT '{}',
  p_authenticated boolean DEFAULT true
)
RETURNS TABLE (entity_type text, entity_id text, title text, body text, url text, topics text[], territories text[], similarity float)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.entity_type, s.entity_id, s.title, s.body, s.url, s.topics, s.territories,
         1 - (s.embedding <=> p_query_embedding) AS similarity
  FROM public.search_index s
  WHERE s.embedding IS NOT NULL
    AND (p_types IS NULL OR s.entity_type = ANY (p_types))
    AND (s.audience = 'public'
         OR (p_authenticated AND s.audience = 'members')
         OR (s.audience = 'private' AND (s.entity_type || ':' || s.entity_id) = ANY (p_allowed_keys)))
  ORDER BY s.embedding <=> p_query_embedding
  LIMIT LEAST(GREATEST(p_match_count, 1), 40);
$$;

CREATE OR REPLACE FUNCTION public.search_index_keyword(
  p_query text,
  p_match_count integer DEFAULT 10,
  p_types text[] DEFAULT NULL,
  p_allowed_keys text[] DEFAULT '{}',
  p_authenticated boolean DEFAULT true
)
RETURNS TABLE (entity_type text, entity_id text, title text, body text, url text, topics text[], territories text[], similarity float)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.entity_type, s.entity_id, s.title, s.body, s.url, s.topics, s.territories,
         CASE WHEN s.title ILIKE '%' || p_query || '%' THEN 0.9 ELSE 0.6 END::float AS similarity
  FROM public.search_index s
  WHERE length(trim(p_query)) >= 2
    AND (s.title ILIKE '%' || p_query || '%' OR s.body ILIKE '%' || p_query || '%')
    AND (p_types IS NULL OR s.entity_type = ANY (p_types))
    AND (s.audience = 'public'
         OR (p_authenticated AND s.audience = 'members')
         OR (s.audience = 'private' AND (s.entity_type || ':' || s.entity_id) = ANY (p_allowed_keys)))
  ORDER BY (s.title ILIKE '%' || p_query || '%') DESC, s.source_updated_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(p_match_count, 1), 40);
$$;

REVOKE ALL ON FUNCTION public.match_search_index(vector, integer, text[], text[], boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.search_index_keyword(text, integer, text[], text[], boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_search_index(vector, integer, text[], text[], boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_index_keyword(text, integer, text[], text[], boolean) TO service_role;
