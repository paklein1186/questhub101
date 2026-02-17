
-- Create agents table
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  system_prompt TEXT NOT NULL,
  skills TEXT[] DEFAULT '{}',
  cost_per_use INTEGER NOT NULL DEFAULT 5,
  creator_user_id UUID NOT NULL,
  territory_id UUID REFERENCES public.territories(id),
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL DEFAULT 'general',
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create agent_hires table (subscriptions/hires)
CREATE TABLE public.agent_hires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  hired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id, agent_id)
);

-- Create agent_conversations table
CREATE TABLE public.agent_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_hires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

-- Agents: anyone can read published, creators can manage their own
CREATE POLICY "Anyone can view published agents" ON public.agents FOR SELECT USING (is_published = true);
CREATE POLICY "Creators can view own agents" ON public.agents FOR SELECT USING (auth.uid() = creator_user_id);
CREATE POLICY "Creators can insert agents" ON public.agents FOR INSERT WITH CHECK (auth.uid() = creator_user_id);
CREATE POLICY "Creators can update own agents" ON public.agents FOR UPDATE USING (auth.uid() = creator_user_id);
CREATE POLICY "Creators can delete own agents" ON public.agents FOR DELETE USING (auth.uid() = creator_user_id);

-- Agent hires: users manage their own
CREATE POLICY "Users can view own hires" ON public.agent_hires FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can hire agents" ON public.agent_hires FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own hires" ON public.agent_hires FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own hires" ON public.agent_hires FOR DELETE USING (auth.uid() = user_id);

-- Conversations: users manage their own
CREATE POLICY "Users can view own conversations" ON public.agent_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create conversations" ON public.agent_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.agent_conversations FOR UPDATE USING (auth.uid() = user_id);

-- Timestamp trigger for agents
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Timestamp trigger for conversations
CREATE TRIGGER update_agent_conversations_updated_at BEFORE UPDATE ON public.agent_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
