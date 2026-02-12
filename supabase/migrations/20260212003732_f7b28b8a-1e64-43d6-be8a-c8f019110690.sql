
-- 1. Remove direct INSERT on credit_transactions (prevent credit manipulation)
DROP POLICY IF EXISTS "Users can insert own credit_transactions" ON public.credit_transactions;

-- 2. Remove direct INSERT on shareholdings (prevent share fraud)
DROP POLICY IF EXISTS "Users can insert own shareholdings" ON public.shareholdings;

-- 3. Restrict notifications INSERT to service_role only (prevent fake notifications)
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
