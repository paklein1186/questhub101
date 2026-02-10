
-- Feed posts table
CREATE TABLE public.feed_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_user_id UUID NOT NULL,
  context_type TEXT NOT NULL DEFAULT 'GLOBAL',
  context_id UUID,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Post attachments table
CREATE TABLE public.post_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('IMAGE', 'DOCUMENT', 'LINK', 'VIDEO_LINK')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  embed_provider TEXT,
  embed_meta JSONB,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_feed_posts_context ON public.feed_posts(context_type, context_id) WHERE NOT is_deleted;
CREATE INDEX idx_feed_posts_author ON public.feed_posts(author_user_id) WHERE NOT is_deleted;
CREATE INDEX idx_post_attachments_post ON public.post_attachments(post_id);

-- RLS
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_attachments ENABLE ROW LEVEL SECURITY;

-- Feed posts: anyone can read non-deleted posts
CREATE POLICY "Anyone can read feed posts"
  ON public.feed_posts FOR SELECT
  USING (NOT is_deleted);

-- Feed posts: authenticated users can create
CREATE POLICY "Authenticated users can create posts"
  ON public.feed_posts FOR INSERT
  WITH CHECK (auth.uid() = author_user_id);

-- Feed posts: authors can update own posts
CREATE POLICY "Authors can update own posts"
  ON public.feed_posts FOR UPDATE
  USING (auth.uid() = author_user_id);

-- Feed posts: authors can delete own posts
CREATE POLICY "Authors can delete own posts"
  ON public.feed_posts FOR DELETE
  USING (auth.uid() = author_user_id);

-- Post attachments: anyone can read (inherited through post visibility)
CREATE POLICY "Anyone can read post attachments"
  ON public.post_attachments FOR SELECT
  USING (true);

-- Post attachments: post author can manage
CREATE POLICY "Post authors can insert attachments"
  ON public.post_attachments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.feed_posts WHERE id = post_id AND author_user_id = auth.uid()
  ));

CREATE POLICY "Post authors can delete attachments"
  ON public.post_attachments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.feed_posts WHERE id = post_id AND author_user_id = auth.uid()
  ));

-- Updated_at trigger for feed_posts
CREATE TRIGGER update_feed_posts_updated_at
  BEFORE UPDATE ON public.feed_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for post uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('post-uploads', 'post-uploads', true, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for post-uploads bucket
CREATE POLICY "Anyone can view post uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-uploads');

CREATE POLICY "Authenticated users can upload to post-uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-uploads' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own post uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'post-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
