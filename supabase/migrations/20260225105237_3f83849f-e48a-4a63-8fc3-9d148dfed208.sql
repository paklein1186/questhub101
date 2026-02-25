-- Fix off-by-one weekday bug: service-specific rules created with weekdays 1-5 (Tue-Sat)
-- should have been 0-4 (Mon-Fri). Shift weekday 5 (Saturday) rules to weekday 4 (Friday)
-- only for service-specific rules where there's no existing weekday 0 (Monday) rule,
-- indicating they were created with the buggy code.

-- Step 1: For each provider+service combo that has weekday=5 but NOT weekday=0,
-- shift all weekdays down by 1 (1->0, 2->1, 3->2, 4->3, 5->4)
UPDATE availability_rules ar
SET weekday = ar.weekday - 1
WHERE ar.service_id IS NOT NULL
  AND ar.weekday BETWEEN 1 AND 5
  AND NOT EXISTS (
    SELECT 1 FROM availability_rules ar2
    WHERE ar2.provider_user_id = ar.provider_user_id
      AND ar2.service_id = ar.service_id
      AND ar2.weekday = 0
  );