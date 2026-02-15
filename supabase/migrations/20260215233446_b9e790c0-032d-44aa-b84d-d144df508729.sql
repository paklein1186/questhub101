
-- Store per-user tab ordering for each view/section
CREATE TABLE public.user_tab_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  view_key text NOT NULL,
  tab_order text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, view_key)
);

-- Enable RLS
ALTER TABLE public.user_tab_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own preferences
CREATE POLICY "Users can view their own tab preferences"
  ON public.user_tab_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tab preferences"
  ON public.user_tab_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tab preferences"
  ON public.user_tab_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tab preferences"
  ON public.user_tab_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_user_tab_preferences_updated_at
  BEFORE UPDATE ON public.user_tab_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
