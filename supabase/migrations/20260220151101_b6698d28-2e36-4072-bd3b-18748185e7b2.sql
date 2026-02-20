
-- Table to store per-user subcalendar preferences (which Google/Outlook subcalendars to sync)
CREATE TABLE public.calendar_subcalendar_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.calendar_connections(id) ON DELETE CASCADE,
  source_calendar_id TEXT NOT NULL,
  source_calendar_name TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, connection_id, source_calendar_id)
);

-- Enable RLS
ALTER TABLE public.calendar_subcalendar_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own preferences
CREATE POLICY "Users can view their own subcalendar preferences"
  ON public.calendar_subcalendar_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subcalendar preferences"
  ON public.calendar_subcalendar_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subcalendar preferences"
  ON public.calendar_subcalendar_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subcalendar preferences"
  ON public.calendar_subcalendar_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_calendar_subcalendar_preferences_updated_at
  BEFORE UPDATE ON public.calendar_subcalendar_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
