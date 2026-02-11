
-- Add credits_balance to guilds
ALTER TABLE public.guilds ADD COLUMN IF NOT EXISTS credits_balance integer NOT NULL DEFAULT 0;

-- Add credits_balance to companies (Traditional Orgs)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS credits_balance integer NOT NULL DEFAULT 0;

-- Create unit_credit_transactions table
CREATE TABLE public.unit_credit_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_type text NOT NULL CHECK (unit_type IN ('GUILD', 'COMPANY')),
  unit_id uuid NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL,
  quest_id uuid REFERENCES public.quests(id),
  note text,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.unit_credit_transactions ENABLE ROW LEVEL SECURITY;

-- Admins of the unit can view transactions
CREATE POLICY "Guild admins can view guild transactions"
  ON public.unit_credit_transactions FOR SELECT TO authenticated
  USING (
    (unit_type = 'GUILD' AND EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_id = unit_credit_transactions.unit_id
      AND user_id = auth.uid()
      AND role = 'ADMIN'
    ))
    OR
    (unit_type = 'COMPANY' AND EXISTS (
      SELECT 1 FROM company_members
      WHERE company_id = unit_credit_transactions.unit_id
      AND user_id = auth.uid()
      AND role = 'ADMIN'
    ))
  );

-- Admins can insert transactions
CREATE POLICY "Unit admins can insert transactions"
  ON public.unit_credit_transactions FOR INSERT TO authenticated
  WITH CHECK (
    created_by_user_id = auth.uid() AND (
      (unit_type = 'GUILD' AND EXISTS (
        SELECT 1 FROM guild_members
        WHERE guild_id = unit_credit_transactions.unit_id
        AND user_id = auth.uid()
        AND role = 'ADMIN'
      ))
      OR
      (unit_type = 'COMPANY' AND EXISTS (
        SELECT 1 FROM company_members
        WHERE company_id = unit_credit_transactions.unit_id
        AND user_id = auth.uid()
        AND role = 'ADMIN'
      ))
    )
  );

-- Index for fast lookups
CREATE INDEX idx_unit_credit_tx_unit ON public.unit_credit_transactions(unit_type, unit_id);
CREATE INDEX idx_unit_credit_tx_created ON public.unit_credit_transactions(created_at DESC);
