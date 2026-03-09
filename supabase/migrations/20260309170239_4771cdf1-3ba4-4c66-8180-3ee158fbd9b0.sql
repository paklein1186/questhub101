
-- Commons pulse history table
CREATE TABLE public.commons_pulse_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_distributed numeric NOT NULL DEFAULT 0,
  recipients_count integer NOT NULL DEFAULT 0,
  triggered_by_user_id uuid,
  distributed_at timestamptz DEFAULT now()
);

ALTER TABLE public.commons_pulse_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pulse history" ON public.commons_pulse_history
  FOR SELECT USING (true);

CREATE POLICY "Admins manage pulse history" ON public.commons_pulse_history
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Distribution function
CREATE OR REPLACE FUNCTION public.distribute_commons_pulse(p_triggered_by uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pool numeric;
  v_threshold numeric := 1000;
  v_total_wu numeric;
  v_distributed numeric := 0;
  v_recipients integer := 0;
  rec record;
BEGIN
  -- Get commons balance
  SELECT balance INTO v_pool FROM ctg_commons_wallet LIMIT 1;
  IF v_pool IS NULL OR v_pool < 1 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'pool_empty');
  END IF;

  -- Get threshold from cooperative_settings if exists
  BEGIN
    SELECT (value::text)::numeric INTO v_threshold
    FROM cooperative_settings WHERE key = 'commons_pulse_threshold';
  EXCEPTION WHEN OTHERS THEN v_threshold := 1000;
  END;

  -- Get total weighted units from last 30 days
  SELECT COALESCE(SUM(weighted_units), 0) INTO v_total_wu
  FROM contribution_logs
  WHERE created_at >= now() - interval '30 days'
    AND weighted_units > 0;

  IF v_total_wu = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_contributors');
  END IF;

  -- Distribute proportionally
  FOR rec IN
    SELECT user_id, SUM(weighted_units) as wu
    FROM contribution_logs
    WHERE created_at >= now() - interval '30 days'
      AND weighted_units > 0
    GROUP BY user_id
    HAVING SUM(weighted_units) > 0
  LOOP
    DECLARE
      v_share numeric;
      v_new_bal numeric;
    BEGIN
      v_share := FLOOR((rec.wu / v_total_wu) * v_pool * 100) / 100;
      IF v_share < 0.1 THEN CONTINUE; END IF;

      -- Credit user wallet
      INSERT INTO ctg_wallets(user_id, balance, lifetime_earned)
        VALUES(rec.user_id, v_share, v_share)
      ON CONFLICT(user_id) DO UPDATE SET
        balance = ctg_wallets.balance + v_share,
        lifetime_earned = ctg_wallets.lifetime_earned + v_share,
        updated_at = now();

      SELECT balance INTO v_new_bal FROM ctg_wallets WHERE user_id = rec.user_id;

      -- Log transaction
      INSERT INTO ctg_transactions(user_id, amount, balance_after, type, note)
      VALUES(rec.user_id, v_share, v_new_bal, 'COMMONS_EMISSION', 'Commons Pulse distribution');

      v_distributed := v_distributed + v_share;
      v_recipients := v_recipients + 1;
    END;
  END LOOP;

  -- Reset commons wallet
  UPDATE ctg_commons_wallet SET
    balance = balance - v_distributed,
    updated_at = now()
  WHERE id = (SELECT id FROM ctg_commons_wallet LIMIT 1);

  -- Log pulse
  INSERT INTO commons_pulse_history(total_distributed, recipients_count, triggered_by_user_id)
  VALUES(v_distributed, v_recipients, p_triggered_by);

  RETURN jsonb_build_object('ok', true, 'distributed', v_distributed, 'recipients', v_recipients);
END;$$;
