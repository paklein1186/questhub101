-- Add pinned_at to quests for entity admin starring
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS pinned_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_quests_pinned ON public.quests (guild_id, company_id, pinned_at) WHERE pinned_at IS NOT NULL;

-- Trigger: enforce max 5 pinned per entity (per guild_id or company_id)
CREATE OR REPLACE FUNCTION public.enforce_quest_pin_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  pin_count integer;
BEGIN
  IF NEW.pinned_at IS NOT NULL AND (OLD.pinned_at IS NULL OR OLD.pinned_at IS DISTINCT FROM NEW.pinned_at) THEN
    IF NEW.guild_id IS NOT NULL THEN
      SELECT count(*) INTO pin_count FROM public.quests
        WHERE guild_id = NEW.guild_id AND pinned_at IS NOT NULL AND id <> NEW.id AND is_deleted = false;
      IF pin_count >= 5 THEN
        RAISE EXCEPTION 'Pin limit reached (max 5 highlighted quests per entity)';
      END IF;
    ELSIF NEW.company_id IS NOT NULL THEN
      SELECT count(*) INTO pin_count FROM public.quests
        WHERE company_id = NEW.company_id AND pinned_at IS NOT NULL AND id <> NEW.id AND is_deleted = false;
      IF pin_count >= 5 THEN
        RAISE EXCEPTION 'Pin limit reached (max 5 highlighted quests per entity)';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_quest_pin_limit ON public.quests;
CREATE TRIGGER trg_enforce_quest_pin_limit
BEFORE UPDATE ON public.quests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_quest_pin_limit();

-- User-level pinned quests (for WorkHub > My Quests view)
CREATE TABLE IF NOT EXISTS public.user_pinned_quests (
  user_id uuid NOT NULL,
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  pinned_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quest_id)
);

ALTER TABLE public.user_pinned_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own pinned quests"
ON public.user_pinned_quests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users pin own quests"
ON public.user_pinned_quests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users unpin own quests"
ON public.user_pinned_quests FOR DELETE
USING (auth.uid() = user_id);

-- Trigger: max 5 per user
CREATE OR REPLACE FUNCTION public.enforce_user_pin_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  pin_count integer;
BEGIN
  SELECT count(*) INTO pin_count FROM public.user_pinned_quests WHERE user_id = NEW.user_id;
  IF pin_count >= 5 THEN
    RAISE EXCEPTION 'You can highlight at most 5 quests';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_user_pin_limit ON public.user_pinned_quests;
CREATE TRIGGER trg_enforce_user_pin_limit
BEFORE INSERT ON public.user_pinned_quests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_user_pin_limit();