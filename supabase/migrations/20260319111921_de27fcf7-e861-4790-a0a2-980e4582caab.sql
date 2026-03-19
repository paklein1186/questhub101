
-- Add external agent columns
ALTER TABLE public.agents
  ADD COLUMN agent_source text NOT NULL DEFAULT 'platform',
  ADD COLUMN external_webhook_url text,
  ADD COLUMN external_llm_config jsonb,
  ADD COLUMN webhook_secret text,
  ADD COLUMN health_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN last_health_check_at timestamptz;

-- Check constraints
ALTER TABLE public.agents
  ADD CONSTRAINT agents_agent_source_check CHECK (agent_source IN ('platform', 'webhook', 'custom_llm')),
  ADD CONSTRAINT agents_health_status_check CHECK (health_status IN ('unknown', 'healthy', 'degraded', 'unreachable'));

-- Validation triggers instead of CHECK for cross-column constraints
CREATE OR REPLACE FUNCTION public.validate_agent_external_config()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.agent_source = 'webhook' AND (NEW.external_webhook_url IS NULL OR NEW.external_webhook_url = '') THEN
    RAISE EXCEPTION 'external_webhook_url is required when agent_source = webhook';
  END IF;
  IF NEW.agent_source = 'custom_llm' AND NEW.external_llm_config IS NULL THEN
    RAISE EXCEPTION 'external_llm_config is required when agent_source = custom_llm';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_agent_external_config
  BEFORE INSERT OR UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_agent_external_config();

-- Partial index on agent_source for published agents
CREATE INDEX idx_agents_source_published ON public.agents (agent_source) WHERE is_published = true;
