
-- Create ICS feed type enum
CREATE TYPE public.ics_feed_type AS ENUM ('PERSONAL_ALL', 'PERSONAL_ONLY_BOOKINGS', 'PERSONAL_ONLY_RITUALS', 'CUSTOM');

-- Create ICS feeds table
CREATE TABLE public.ics_feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  type public.ics_feed_type NOT NULL DEFAULT 'PERSONAL_ALL',
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  label TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  filters JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT ics_feeds_unique_user_type UNIQUE (owner_user_id, type)
);

-- Index for fast lookup by id+token (the public endpoint)
CREATE INDEX idx_ics_feeds_token ON public.ics_feeds (id, token);

-- Enable RLS
ALTER TABLE public.ics_feeds ENABLE ROW LEVEL SECURITY;

-- Users can view their own feeds
CREATE POLICY "Users can view their own ICS feeds"
  ON public.ics_feeds FOR SELECT
  USING (auth.uid() = owner_user_id);

-- Users can insert their own feeds
CREATE POLICY "Users can create their own ICS feeds"
  ON public.ics_feeds FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

-- Users can update their own feeds
CREATE POLICY "Users can update their own ICS feeds"
  ON public.ics_feeds FOR UPDATE
  USING (auth.uid() = owner_user_id);

-- Users can delete their own feeds
CREATE POLICY "Users can delete their own ICS feeds"
  ON public.ics_feeds FOR DELETE
  USING (auth.uid() = owner_user_id);

-- Updated_at trigger
CREATE TRIGGER update_ics_feeds_updated_at
  BEFORE UPDATE ON public.ics_feeds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
