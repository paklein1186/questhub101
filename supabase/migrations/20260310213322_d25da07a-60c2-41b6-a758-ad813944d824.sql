
ALTER TABLE public.contribution_logs
  ADD COLUMN evidence_required BOOLEAN GENERATED ALWAYS AS (
    contribution_type IN ('EXPENSES', 'SUPPLIES', 'EQUIPMENT')
  ) STORED;
