
CREATE TABLE public.feature_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  source TEXT NOT NULL DEFAULT 'HOME_FREE' CHECK (source IN ('HOME_FREE', 'HOME_GUIDED', 'OTHER')),
  persona_at_time TEXT DEFAULT 'UNSET',
  original_text TEXT NOT NULL,
  interpreted_action_type TEXT,
  confidence_score NUMERIC(5,2),
  user_explicit BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'REVIEWED', 'IMPLEMENTED', 'DISMISSED')),
  admin_comment TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create feature suggestions"
  ON public.feature_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own suggestions"
  ON public.feature_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all suggestions"
  ON public.feature_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can update suggestions"
  ON public.feature_suggestions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  );

CREATE TRIGGER update_feature_suggestions_updated_at
  BEFORE UPDATE ON public.feature_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
