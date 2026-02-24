
-- Allow authenticated users to read subcalendar preferences for any provider
-- This is needed so bookers can filter busy events by enabled subcalendars
DROP POLICY IF EXISTS "Users can view their own subcalendar preferences" ON calendar_subcalendar_preferences;

CREATE POLICY "Authenticated users can read subcalendar preferences"
  ON calendar_subcalendar_preferences
  FOR SELECT
  TO authenticated
  USING (true);
