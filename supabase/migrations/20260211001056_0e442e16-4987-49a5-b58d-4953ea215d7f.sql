
-- Leaderboard scores: one row per user per time_scope, refreshed periodically or on-demand
CREATE TABLE public.leaderboard_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  time_scope text NOT NULL CHECK (time_scope IN ('WEEKLY','MONTHLY','ALL_TIME')),
  period_start timestamptz,
  helpful_score integer NOT NULL DEFAULT 0,
  creator_score integer NOT NULL DEFAULT 0,
  collaborator_score integer NOT NULL DEFAULT 0,
  territory_score integer NOT NULL DEFAULT 0,
  mentor_score integer NOT NULL DEFAULT 0,
  guild_score integer NOT NULL DEFAULT 0,
  rising_score integer NOT NULL DEFAULT 0,
  ai_score integer NOT NULL DEFAULT 0,
  xp_gained integer NOT NULL DEFAULT 0,
  followers_gained integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, time_scope)
);

ALTER TABLE public.leaderboard_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaderboard scores are publicly readable"
  ON public.leaderboard_scores FOR SELECT USING (true);

-- Only edge functions (service role) write to this table, no user INSERT/UPDATE/DELETE policies needed.

CREATE INDEX idx_leaderboard_time_scope ON public.leaderboard_scores(time_scope);
CREATE INDEX idx_leaderboard_helpful ON public.leaderboard_scores(time_scope, helpful_score DESC);
CREATE INDEX idx_leaderboard_creator ON public.leaderboard_scores(time_scope, creator_score DESC);
CREATE INDEX idx_leaderboard_collaborator ON public.leaderboard_scores(time_scope, collaborator_score DESC);
CREATE INDEX idx_leaderboard_territory ON public.leaderboard_scores(time_scope, territory_score DESC);
CREATE INDEX idx_leaderboard_mentor ON public.leaderboard_scores(time_scope, mentor_score DESC);
CREATE INDEX idx_leaderboard_guild ON public.leaderboard_scores(time_scope, guild_score DESC);
CREATE INDEX idx_leaderboard_rising ON public.leaderboard_scores(time_scope, rising_score DESC);
CREATE INDEX idx_leaderboard_ai ON public.leaderboard_scores(time_scope, ai_score DESC);
