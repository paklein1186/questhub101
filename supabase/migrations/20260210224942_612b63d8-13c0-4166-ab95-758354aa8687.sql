
-- 1. Upvotes table
CREATE TABLE public.starred_excerpt_upvotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  excerpt_id UUID NOT NULL REFERENCES public.starred_excerpts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (excerpt_id, user_id)
);

CREATE INDEX idx_excerpt_upvotes_excerpt ON public.starred_excerpt_upvotes(excerpt_id);
CREATE INDEX idx_excerpt_upvotes_user ON public.starred_excerpt_upvotes(user_id);

ALTER TABLE public.starred_excerpt_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view upvotes"
ON public.starred_excerpt_upvotes FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their own upvotes"
ON public.starred_excerpt_upvotes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own upvotes"
ON public.starred_excerpt_upvotes FOR DELETE
USING (auth.uid() = user_id);

-- 2. Add upvotes_count column to starred_excerpts
ALTER TABLE public.starred_excerpts ADD COLUMN upvotes_count INTEGER NOT NULL DEFAULT 0;

-- 3. Trigger to maintain upvotes_count
CREATE OR REPLACE FUNCTION public.update_excerpt_upvotes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.starred_excerpts SET upvotes_count = upvotes_count + 1 WHERE id = NEW.excerpt_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.starred_excerpts SET upvotes_count = GREATEST(upvotes_count - 1, 0) WHERE id = OLD.excerpt_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_excerpt_upvotes_count
AFTER INSERT OR DELETE ON public.starred_excerpt_upvotes
FOR EACH ROW EXECUTE FUNCTION public.update_excerpt_upvotes_count();

-- 4. Reports table
CREATE TABLE public.starred_excerpt_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  excerpt_id UUID NOT NULL REFERENCES public.starred_excerpts(id) ON DELETE CASCADE,
  reported_by_user_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('INAPPROPRIATE', 'HARASSMENT', 'SPAM', 'IRRELEVANT', 'OTHER')),
  custom_reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'DISMISSED')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by_user_id UUID,
  UNIQUE (excerpt_id, reported_by_user_id)
);

CREATE INDEX idx_excerpt_reports_excerpt ON public.starred_excerpt_reports(excerpt_id);
CREATE INDEX idx_excerpt_reports_status ON public.starred_excerpt_reports(status);

ALTER TABLE public.starred_excerpt_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports; admins can view all
CREATE POLICY "Users can view own reports and admins all"
ON public.starred_excerpt_reports FOR SELECT
USING (
  auth.uid() = reported_by_user_id
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Authenticated users can create reports"
ON public.starred_excerpt_reports FOR INSERT
WITH CHECK (auth.uid() = reported_by_user_id);

CREATE POLICY "Admins can update reports"
ON public.starred_excerpt_reports FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Add soft-delete to starred_excerpts
ALTER TABLE public.starred_excerpts ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.starred_excerpts ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
