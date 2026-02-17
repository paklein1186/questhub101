
-- Add access_roles to rituals for role-based gating
ALTER TABLE public.rituals ADD COLUMN IF NOT EXISTS access_roles text[] DEFAULT '{}';

-- Add status to ritual_attendees for attend/decline
ALTER TABLE public.ritual_attendees ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'attending';
-- status values: 'attending', 'declined', 'tentative'
