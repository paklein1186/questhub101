
-- Table to store each broadcast campaign
CREATE TABLE public.broadcast_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_user_id UUID NOT NULL,
  sender_label TEXT,
  sender_entity_type TEXT, -- 'platform', 'guild', etc.
  sender_entity_id UUID,
  subject TEXT,
  content TEXT NOT NULL,
  link_url TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  audience_segments JSONB DEFAULT '[]'::jsonb,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table to track each recipient's delivery & read status
CREATE TABLE public.broadcast_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id UUID NOT NULL REFERENCES public.broadcast_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX idx_broadcast_recipients_broadcast ON public.broadcast_recipients(broadcast_id);
CREATE INDEX idx_broadcast_recipients_user ON public.broadcast_recipients(user_id);
CREATE INDEX idx_broadcast_recipients_status ON public.broadcast_recipients(broadcast_id, status);
CREATE INDEX idx_broadcast_messages_sender ON public.broadcast_messages(sender_user_id);

-- Enable RLS
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- Only admins (sender) can see broadcast messages they sent
CREATE POLICY "Senders can view their broadcasts"
  ON public.broadcast_messages FOR SELECT
  USING (auth.uid() = sender_user_id);

CREATE POLICY "Senders can insert broadcasts"
  ON public.broadcast_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_user_id);

-- Recipients can view their own recipient row; senders can view all for their broadcast
CREATE POLICY "Users can view their own broadcast receipts"
  ON public.broadcast_recipients FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.broadcast_messages bm
      WHERE bm.id = broadcast_id AND bm.sender_user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert broadcast recipients"
  ON public.broadcast_recipients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.broadcast_messages bm
      WHERE bm.id = broadcast_id AND bm.sender_user_id = auth.uid()
    )
  );

-- Recipients can update their own row (for marking read)
CREATE POLICY "Recipients can mark as read"
  ON public.broadcast_recipients FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
