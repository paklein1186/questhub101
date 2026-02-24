
-- Add service_type column to services table
ALTER TABLE public.services 
  ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'online_call';

-- Add location fields for in-person services (mission/event)
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS location_text text,
  ADD COLUMN IF NOT EXISTS location_type text NOT NULL DEFAULT 'online';

COMMENT ON COLUMN public.services.service_type IS 'Type: online_call, service_mission, event_attendance';
COMMENT ON COLUMN public.services.location_type IS 'online, in_person, hybrid';
