
-- Add source calendar metadata to busy events
ALTER TABLE public.calendar_busy_events
  ADD COLUMN source_calendar_id TEXT,
  ADD COLUMN source_calendar_name TEXT;

-- Index for efficient filtering
CREATE INDEX idx_busy_events_source_cal ON public.calendar_busy_events (user_id, source_calendar_id);
