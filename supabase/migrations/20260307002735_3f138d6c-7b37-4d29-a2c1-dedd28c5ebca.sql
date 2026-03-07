
CREATE TABLE public.guild_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'weight_change',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.guild_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guild members can view decisions"
  ON public.guild_decisions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_members gm
      WHERE gm.guild_id = guild_decisions.guild_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Guild members can insert decisions"
  ON public.guild_decisions FOR INSERT TO authenticated
  WITH CHECK (
    proposed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.guild_members gm
      WHERE gm.guild_id = guild_decisions.guild_id
      AND gm.user_id = auth.uid()
    )
  );
