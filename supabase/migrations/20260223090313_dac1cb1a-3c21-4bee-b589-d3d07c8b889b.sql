-- Create guild_service_visibility table (mirrors company_service_visibility)
CREATE TABLE public.guild_service_visibility (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(guild_id, service_id)
);

-- Enable RLS
ALTER TABLE public.guild_service_visibility ENABLE ROW LEVEL SECURITY;

-- Anyone can read visibility settings (needed for public display)
CREATE POLICY "Anyone can view guild service visibility"
  ON public.guild_service_visibility
  FOR SELECT
  USING (true);

-- Guild admins can manage visibility
CREATE POLICY "Guild admins can insert visibility"
  ON public.guild_service_visibility
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guild_members gm
      WHERE gm.guild_id = guild_service_visibility.guild_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
    )
  );

CREATE POLICY "Guild admins can update visibility"
  ON public.guild_service_visibility
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_members gm
      WHERE gm.guild_id = guild_service_visibility.guild_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
    )
  );

CREATE POLICY "Guild admins can delete visibility"
  ON public.guild_service_visibility
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_members gm
      WHERE gm.guild_id = guild_service_visibility.guild_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
    )
  );