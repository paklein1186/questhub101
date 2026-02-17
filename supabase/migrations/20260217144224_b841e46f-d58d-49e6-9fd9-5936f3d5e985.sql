
-- Add upvote count to attachments
ALTER TABLE public.attachments ADD COLUMN upvote_count integer NOT NULL DEFAULT 0;

-- Create attachment_upvotes table
CREATE TABLE public.attachment_upvotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attachment_id uuid NOT NULL REFERENCES public.attachments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(attachment_id, user_id)
);

ALTER TABLE public.attachment_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view attachment upvotes"
ON public.attachment_upvotes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can upvote"
ON public.attachment_upvotes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own upvote"
ON public.attachment_upvotes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Trigger to update upvote_count
CREATE OR REPLACE FUNCTION public.update_attachment_upvotes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.attachments SET upvote_count = upvote_count + 1 WHERE id = NEW.attachment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.attachments SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id = OLD.attachment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_attachment_upvotes
AFTER INSERT OR DELETE ON public.attachment_upvotes
FOR EACH ROW EXECUTE FUNCTION public.update_attachment_upvotes_count();

-- Allow uploaders to delete their own attachments
CREATE POLICY "Uploaders can delete their own attachments"
ON public.attachments FOR DELETE TO authenticated
USING (auth.uid() = uploaded_by_user_id);
