
-- Junction table: feed_posts ↔ territories
CREATE TABLE public.post_territories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, territory_id)
);

-- Junction table: feed_posts ↔ topics
CREATE TABLE public.post_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, topic_id)
);

-- Indexes for efficient filtering
CREATE INDEX idx_post_territories_territory ON public.post_territories(territory_id);
CREATE INDEX idx_post_territories_post ON public.post_territories(post_id);
CREATE INDEX idx_post_topics_topic ON public.post_topics(topic_id);
CREATE INDEX idx_post_topics_post ON public.post_topics(post_id);

-- Enable RLS
ALTER TABLE public.post_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_topics ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can read post ontology attachments
CREATE POLICY "Anyone can view post territories"
  ON public.post_territories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view post topics"
  ON public.post_topics FOR SELECT
  USING (true);

-- RLS: Only post author can insert/delete ontology attachments
CREATE POLICY "Post author can attach territories"
  ON public.post_territories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.feed_posts
      WHERE id = post_id AND author_user_id = auth.uid()
    )
  );

CREATE POLICY "Post author can detach territories"
  ON public.post_territories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.feed_posts
      WHERE id = post_id AND author_user_id = auth.uid()
    )
  );

CREATE POLICY "Post author can attach topics"
  ON public.post_topics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.feed_posts
      WHERE id = post_id AND author_user_id = auth.uid()
    )
  );

CREATE POLICY "Post author can detach topics"
  ON public.post_topics FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.feed_posts
      WHERE id = post_id AND author_user_id = auth.uid()
    )
  );
