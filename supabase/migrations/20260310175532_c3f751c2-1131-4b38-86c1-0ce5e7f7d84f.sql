-- Quest Contracts
CREATE TABLE IF NOT EXISTS public.quest_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.quest_contracts ENABLE ROW LEVEL SECURITY;

-- Contract Signatories
CREATE TABLE IF NOT EXISTS public.contract_signatories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.quest_contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  signed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_note TEXT,
  UNIQUE(contract_id, user_id)
);
ALTER TABLE public.contract_signatories ENABLE ROW LEVEL SECURITY;

-- Contract Amendments
CREATE TABLE IF NOT EXISTS public.contract_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.quest_contracts(id) ON DELETE CASCADE,
  amendment_number INTEGER NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  proposed_by UUID,
  status TEXT NOT NULL DEFAULT 'proposed',
  proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.contract_amendments ENABLE ROW LEVEL SECURITY;

-- Amendment Votes
CREATE TABLE IF NOT EXISTS public.amendment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amendment_id UUID NOT NULL REFERENCES public.contract_amendments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote TEXT NOT NULL DEFAULT 'accept',
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(amendment_id, user_id)
);
ALTER TABLE public.amendment_votes ENABLE ROW LEVEL SECURITY;

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_contract_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('draft','pending_signatures','active','amended','closed') THEN
    RAISE EXCEPTION 'Invalid contract status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_contract_status ON public.quest_contracts;
CREATE TRIGGER trg_validate_contract_status BEFORE INSERT OR UPDATE ON public.quest_contracts
  FOR EACH ROW EXECUTE FUNCTION public.validate_contract_status();

CREATE OR REPLACE FUNCTION public.validate_amendment_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('proposed','accepted','rejected') THEN
    RAISE EXCEPTION 'Invalid amendment status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_amendment_status ON public.contract_amendments;
CREATE TRIGGER trg_validate_amendment_status BEFORE INSERT OR UPDATE ON public.contract_amendments
  FOR EACH ROW EXECUTE FUNCTION public.validate_amendment_status();

CREATE OR REPLACE FUNCTION public.validate_amendment_vote()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.vote NOT IN ('accept','reject') THEN
    RAISE EXCEPTION 'Invalid amendment vote: %', NEW.vote;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_amendment_vote ON public.amendment_votes;
CREATE TRIGGER trg_validate_amendment_vote BEFORE INSERT OR UPDATE ON public.amendment_votes
  FOR EACH ROW EXECUTE FUNCTION public.validate_amendment_vote();

-- RLS policies: quest_contracts
CREATE POLICY "Read contracts" ON public.quest_contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create contracts" ON public.quest_contracts FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Update own contracts" ON public.quest_contracts FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- RLS policies: contract_signatories
CREATE POLICY "Read signatories" ON public.contract_signatories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert own signatory" ON public.contract_signatories FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own signatory" ON public.contract_signatories FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- RLS policies: contract_amendments
CREATE POLICY "Read amendments" ON public.contract_amendments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Propose amendments" ON public.contract_amendments FOR INSERT TO authenticated WITH CHECK (proposed_by = auth.uid());
CREATE POLICY "Update own amendments" ON public.contract_amendments FOR UPDATE TO authenticated USING (proposed_by = auth.uid()) WITH CHECK (proposed_by = auth.uid());

-- RLS policies: amendment_votes
CREATE POLICY "Read amendment votes" ON public.amendment_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Cast amendment vote" ON public.amendment_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own amendment vote" ON public.amendment_votes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());