
-- ============================================================
-- RITUAL LAYER — Guild Periodic Synchronization
-- ============================================================

-- Ritual session type enum
CREATE TYPE public.ritual_session_type AS ENUM (
  'INFORMAL_HANGING',
  'EMOTIONAL_CHECKIN',
  'GUILD_ASSEMBLY',
  'MASTERMIND',
  'LEARNING_LAB',
  'SPRINT_ALIGNMENT',
  'CONFLICT_RESOLUTION',
  'VISIONARY_SESSION',
  'CROSS_GUILD_FEDERATION',
  'CELEBRATION'
);

-- Ritual frequency enum
CREATE TYPE public.ritual_frequency AS ENUM (
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'CUSTOM'
);

-- Ritual access type enum
CREATE TYPE public.ritual_access_type AS ENUM (
  'PUBLIC',
  'MEMBERS',
  'ROLES',
  'XP_THRESHOLD',
  'SHARE_CLASS',
  'INVITE_ONLY'
);

-- ── Rituals (templates/definitions) ──────────────────────────
CREATE TABLE public.rituals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  session_type public.ritual_session_type NOT NULL DEFAULT 'GUILD_ASSEMBLY',
  frequency public.ritual_frequency NOT NULL DEFAULT 'MONTHLY',
  custom_cron TEXT, -- for CUSTOM frequency
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  -- Access control
  access_type public.ritual_access_type NOT NULL DEFAULT 'MEMBERS',
  access_roles TEXT[], -- entity role IDs if access_type = ROLES
  min_xp INTEGER, -- if access_type = XP_THRESHOLD
  min_share_class TEXT, -- if access_type = SHARE_CLASS (A, B, C)
  -- Program structure (JSON array of segments)
  program_segments JSONB DEFAULT '[]'::jsonb,
  -- XP & credits
  xp_reward INTEGER NOT NULL DEFAULT 5,
  facilitator_xp_bonus INTEGER NOT NULL DEFAULT 10,
  credit_reward INTEGER DEFAULT 0,
  -- Visio
  recording_enabled BOOLEAN NOT NULL DEFAULT false,
  default_visio_link TEXT,
  -- Archive
  archive_visibility TEXT NOT NULL DEFAULT 'members', -- 'public', 'members', 'admins'
  -- Meta
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_occurrence TIMESTAMPTZ,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Ritual Occurrences (individual instances) ─────────────────
CREATE TABLE public.ritual_occurrences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ritual_id UUID NOT NULL REFERENCES public.rituals(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  visio_link TEXT,
  -- Content
  notes TEXT,
  decisions JSONB DEFAULT '[]'::jsonb,
  quests_created UUID[] DEFAULT '{}',
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Ritual Attendees ──────────────────────────────────────────
CREATE TABLE public.ritual_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  occurrence_id UUID NOT NULL REFERENCES public.ritual_occurrences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant', -- participant, facilitator
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_granted BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(occurrence_id, user_id)
);

-- Indexes
CREATE INDEX idx_rituals_guild ON public.rituals(guild_id);
CREATE INDEX idx_ritual_occurrences_ritual ON public.ritual_occurrences(ritual_id);
CREATE INDEX idx_ritual_occurrences_scheduled ON public.ritual_occurrences(scheduled_at);
CREATE INDEX idx_ritual_attendees_occurrence ON public.ritual_attendees(occurrence_id);
CREATE INDEX idx_ritual_attendees_user ON public.ritual_attendees(user_id);

-- Updated-at triggers
CREATE TRIGGER update_rituals_updated_at BEFORE UPDATE ON public.rituals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ritual_occurrences_updated_at BEFORE UPDATE ON public.ritual_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE public.rituals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ritual_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ritual_attendees ENABLE ROW LEVEL SECURITY;

-- Rituals: anyone can read (access filtering done in app), guild admins can manage
CREATE POLICY "Anyone can view rituals" ON public.rituals FOR SELECT USING (true);

CREATE POLICY "Guild admins can create rituals" ON public.rituals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guild_members gm
      WHERE gm.guild_id = rituals.guild_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
    )
  );

CREATE POLICY "Guild admins can update rituals" ON public.rituals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_members gm
      WHERE gm.guild_id = rituals.guild_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
    )
  );

CREATE POLICY "Guild admins can delete rituals" ON public.rituals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_members gm
      WHERE gm.guild_id = rituals.guild_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
    )
  );

-- Platform admins can manage all rituals
CREATE POLICY "Platform admins manage rituals" ON public.rituals
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Occurrences: readable by anyone (access filtering in app)
CREATE POLICY "Anyone can view ritual occurrences" ON public.ritual_occurrences FOR SELECT USING (true);

CREATE POLICY "Guild admins can manage occurrences" ON public.ritual_occurrences FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rituals r
      JOIN public.guild_members gm ON gm.guild_id = r.guild_id
      WHERE r.id = ritual_occurrences.ritual_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
    )
  );

CREATE POLICY "Guild admins can update occurrences" ON public.ritual_occurrences FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.rituals r
      JOIN public.guild_members gm ON gm.guild_id = r.guild_id
      WHERE r.id = ritual_occurrences.ritual_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
    )
  );

CREATE POLICY "Guild admins can delete occurrences" ON public.ritual_occurrences FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.rituals r
      JOIN public.guild_members gm ON gm.guild_id = r.guild_id
      WHERE r.id = ritual_occurrences.ritual_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
    )
  );

CREATE POLICY "Platform admins manage occurrences" ON public.ritual_occurrences
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Attendees: users can see all, insert themselves, admins manage
CREATE POLICY "Anyone can view attendees" ON public.ritual_attendees FOR SELECT USING (true);

CREATE POLICY "Users can register themselves" ON public.ritual_attendees FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove themselves" ON public.ritual_attendees FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Guild admins manage attendees" ON public.ritual_attendees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ritual_occurrences ro
      JOIN public.rituals r ON r.id = ro.ritual_id
      JOIN public.guild_members gm ON gm.guild_id = r.guild_id
      WHERE ro.id = ritual_attendees.occurrence_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
    )
  );

CREATE POLICY "Platform admins manage attendees" ON public.ritual_attendees
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
