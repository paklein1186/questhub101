
-- Enums for Trust Graph
CREATE TYPE public.trust_node_type AS ENUM ('profile', 'guild', 'quest', 'service', 'partner_entity', 'territory');
CREATE TYPE public.trust_edge_type AS ENUM ('skill_trust', 'reliability', 'collaboration', 'stewardship', 'financial_trust');
CREATE TYPE public.trust_visibility AS ENUM ('public', 'network', 'private');
CREATE TYPE public.trust_status AS ENUM ('active', 'outdated', 'retracted');

-- Trust Edges table
CREATE TABLE public.trust_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_node_type public.trust_node_type NOT NULL,
  from_node_id UUID NOT NULL,
  to_node_type public.trust_node_type NOT NULL,
  to_node_id UUID NOT NULL,
  edge_type public.trust_edge_type NOT NULL,
  tags TEXT[] DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 3,
  note TEXT,
  evidence_url TEXT,
  visibility public.trust_visibility NOT NULL DEFAULT 'public',
  context_quest_id UUID REFERENCES public.quests(id) ON DELETE SET NULL,
  context_guild_id UUID REFERENCES public.guilds(id) ON DELETE SET NULL,
  context_territory_id UUID REFERENCES public.territories(id) ON DELETE SET NULL,
  status public.trust_status NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_confirmed_at TIMESTAMPTZ DEFAULT now()
);

-- Validation trigger for score range and note length
CREATE OR REPLACE FUNCTION public.validate_trust_edge()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.score < 1 OR NEW.score > 5 THEN
    RAISE EXCEPTION 'Score must be between 1 and 5';
  END IF;
  IF length(NEW.note) > 300 THEN
    RAISE EXCEPTION 'Note must be 300 characters or fewer';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_trust_edge
  BEFORE INSERT OR UPDATE ON public.trust_edges
  FOR EACH ROW EXECUTE FUNCTION public.validate_trust_edge();

-- Updated_at trigger
CREATE TRIGGER trg_trust_edges_updated_at
  BEFORE UPDATE ON public.trust_edges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for graph traversal
CREATE INDEX idx_trust_edges_from ON public.trust_edges (from_node_type, from_node_id);
CREATE INDEX idx_trust_edges_to ON public.trust_edges (to_node_type, to_node_id);
CREATE INDEX idx_trust_edges_edge_type ON public.trust_edges (edge_type);
CREATE INDEX idx_trust_edges_status ON public.trust_edges (status);

-- Prevent duplicate active edges between same pair for same edge_type
CREATE UNIQUE INDEX idx_trust_edges_unique_active
  ON public.trust_edges (from_node_type, from_node_id, to_node_type, to_node_id, edge_type)
  WHERE status = 'active';

-- RLS
ALTER TABLE public.trust_edges ENABLE ROW LEVEL SECURITY;

-- Public/network edges visible to authenticated users
CREATE POLICY "Authenticated users can view public trust edges"
  ON public.trust_edges FOR SELECT TO authenticated
  USING (visibility IN ('public', 'network'));

-- Private edges visible only to creator
CREATE POLICY "Creator can view own private trust edges"
  ON public.trust_edges FOR SELECT TO authenticated
  USING (visibility = 'private' AND created_by = auth.uid());

-- Insert: authenticated users can create edges where they are the actor
CREATE POLICY "Authenticated users can create trust edges"
  ON public.trust_edges FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Update: only creator can update
CREATE POLICY "Creator can update own trust edges"
  ON public.trust_edges FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Delete: only creator can delete
CREATE POLICY "Creator can delete own trust edges"
  ON public.trust_edges FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Superadmins can do everything
CREATE POLICY "Superadmins full access to trust edges"
  ON public.trust_edges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));
