-- Allow anonymous users to read busy events for public booking pages
CREATE POLICY "Anon users can view busy events for public booking"
  ON calendar_busy_events FOR SELECT TO anon USING (true);

-- Allow anonymous users to read subcalendar preferences for filtering
CREATE POLICY "Anon users can read subcalendar preferences"
  ON calendar_subcalendar_preferences FOR SELECT TO anon USING (true);