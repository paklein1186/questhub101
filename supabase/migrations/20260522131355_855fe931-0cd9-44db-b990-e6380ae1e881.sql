
-- Add evidence column to user_milestones
ALTER TABLE public.user_milestones
ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Create storage bucket for milestone evidence (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('milestone-evidence', 'milestone-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can manage files under their own user_id folder
CREATE POLICY "Users can read their milestone evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'milestone-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their milestone evidence"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'milestone-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their milestone evidence"
ON storage.objects FOR UPDATE
USING (bucket_id = 'milestone-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their milestone evidence"
ON storage.objects FOR DELETE
USING (bucket_id = 'milestone-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);
