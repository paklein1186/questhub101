
-- Create unit_availability table for guild & company scheduling
CREATE TABLE public.unit_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('GUILD', 'COMPANY')),
  unit_id UUID NOT NULL,
  weekly_schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  exceptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_bookings_per_day INTEGER,
  availability_mode TEXT NOT NULL DEFAULT 'always_available' CHECK (availability_mode IN ('always_available', 'specific_slots', 'custom_calendar')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unit_type, unit_id)
);

-- Enable RLS
ALTER TABLE public.unit_availability ENABLE ROW LEVEL SECURITY;

-- Anyone can read availability (needed for booking UI)
CREATE POLICY "Anyone can view unit availability"
ON public.unit_availability FOR SELECT
USING (true);

-- Guild admins can manage their guild's availability
CREATE POLICY "Guild admins can manage guild availability"
ON public.unit_availability FOR ALL
TO authenticated
USING (
  unit_type = 'GUILD' AND EXISTS (
    SELECT 1 FROM guild_members WHERE guild_id = unit_id AND user_id = auth.uid() AND role = 'ADMIN'
  )
)
WITH CHECK (
  unit_type = 'GUILD' AND EXISTS (
    SELECT 1 FROM guild_members WHERE guild_id = unit_id AND user_id = auth.uid() AND role = 'ADMIN'
  )
);

-- Company admins/owners can manage their company's availability
CREATE POLICY "Company admins can manage company availability"
ON public.unit_availability FOR ALL
TO authenticated
USING (
  unit_type = 'COMPANY' AND EXISTS (
    SELECT 1 FROM company_members WHERE company_id = unit_id AND user_id = auth.uid() AND role IN ('admin', 'owner', 'ADMIN')
  )
)
WITH CHECK (
  unit_type = 'COMPANY' AND EXISTS (
    SELECT 1 FROM company_members WHERE company_id = unit_id AND user_id = auth.uid() AND role IN ('admin', 'owner', 'ADMIN')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_unit_availability_updated_at
BEFORE UPDATE ON public.unit_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
