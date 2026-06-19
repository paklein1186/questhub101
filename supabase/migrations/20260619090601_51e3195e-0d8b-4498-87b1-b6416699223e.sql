
create extension if not exists vector;

create table public.guild_agents (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  name text not null default 'Agent',
  avatar_url text,
  persona_prompt text not null default 'You are a helpful AI assistant for this community. Be concise, professional and accurate.',
  model text not null default 'google/gemini-2.5-flash',
  status text not null default 'active',
  allow_mcp_write boolean not null default false,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guild_id)
);
grant select, insert, update, delete on public.guild_agents to authenticated;
grant all on public.guild_agents to service_role;
alter table public.guild_agents enable row level security;

create policy "Guild admins manage agent"
on public.guild_agents for all to authenticated
using (exists (
  select 1 from public.guild_members gm
  where gm.guild_id = guild_agents.guild_id
    and gm.user_id = auth.uid()
    and gm.role = 'ADMIN'
))
with check (exists (
  select 1 from public.guild_members gm
  where gm.guild_id = guild_agents.guild_id
    and gm.user_id = auth.uid()
    and gm.role = 'ADMIN'
));

create policy "Guild members can view agent"
on public.guild_agents for select to authenticated
using (exists (
  select 1 from public.guild_members gm
  where gm.guild_id = guild_agents.guild_id and gm.user_id = auth.uid()
));

create table public.guild_agent_sources (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.guild_agents(id) on delete cascade,
  type text not null,
  title text,
  config jsonb not null default '{}'::jsonb,
  status text not null default 'idle',
  last_sync_at timestamptz,
  last_error text,
  document_count integer not null default 0,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.guild_agent_sources to authenticated;
grant all on public.guild_agent_sources to service_role;
alter table public.guild_agent_sources enable row level security;

create policy "Guild admins manage sources"
on public.guild_agent_sources for all to authenticated
using (exists (
  select 1 from public.guild_agents a
  join public.guild_members gm on gm.guild_id = a.guild_id
  where a.id = guild_agent_sources.agent_id
    and gm.user_id = auth.uid() and gm.role = 'ADMIN'
))
with check (exists (
  select 1 from public.guild_agents a
  join public.guild_members gm on gm.guild_id = a.guild_id
  where a.id = guild_agent_sources.agent_id
    and gm.user_id = auth.uid() and gm.role = 'ADMIN'
));

create table public.guild_agent_documents (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.guild_agents(id) on delete cascade,
  source_id uuid references public.guild_agent_sources(id) on delete cascade,
  external_id text,
  title text,
  chunk_index integer not null default 0,
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.guild_agent_documents to authenticated;
grant all on public.guild_agent_documents to service_role;
alter table public.guild_agent_documents enable row level security;

create index guild_agent_documents_agent_idx on public.guild_agent_documents (agent_id);
create index guild_agent_documents_embedding_idx
  on public.guild_agent_documents using hnsw (embedding vector_cosine_ops);

create policy "Guild admins read documents"
on public.guild_agent_documents for select to authenticated
using (exists (
  select 1 from public.guild_agents a
  join public.guild_members gm on gm.guild_id = a.guild_id
  where a.id = guild_agent_documents.agent_id
    and gm.user_id = auth.uid() and gm.role = 'ADMIN'
));

create policy "Guild admins delete documents"
on public.guild_agent_documents for delete to authenticated
using (exists (
  select 1 from public.guild_agents a
  join public.guild_members gm on gm.guild_id = a.guild_id
  where a.id = guild_agent_documents.agent_id
    and gm.user_id = auth.uid() and gm.role = 'ADMIN'
));

create or replace function public.match_guild_agent_documents(
  p_agent_id uuid,
  p_query_embedding vector(1536),
  p_match_count integer default 5
)
returns table (
  id uuid,
  source_id uuid,
  title text,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable security definer
set search_path = public
as $$
  select d.id, d.source_id, d.title, d.content, d.metadata,
         1 - (d.embedding <=> p_query_embedding) as similarity
  from public.guild_agent_documents d
  where d.agent_id = p_agent_id and d.embedding is not null
  order by d.embedding <=> p_query_embedding
  limit p_match_count;
$$;

create table public.guild_agent_channels (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.guild_agents(id) on delete cascade,
  type text not null,
  label text,
  config jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  last_error text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.guild_agent_channels to authenticated;
grant all on public.guild_agent_channels to service_role;
alter table public.guild_agent_channels enable row level security;

create policy "Guild admins manage channels"
on public.guild_agent_channels for all to authenticated
using (exists (
  select 1 from public.guild_agents a
  join public.guild_members gm on gm.guild_id = a.guild_id
  where a.id = guild_agent_channels.agent_id
    and gm.user_id = auth.uid() and gm.role = 'ADMIN'
))
with check (exists (
  select 1 from public.guild_agents a
  join public.guild_members gm on gm.guild_id = a.guild_id
  where a.id = guild_agent_channels.agent_id
    and gm.user_id = auth.uid() and gm.role = 'ADMIN'
));

create table public.guild_agent_conversations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.guild_agents(id) on delete cascade,
  channel_id uuid references public.guild_agent_channels(id) on delete set null,
  external_chat_id text,
  member_user_id uuid,
  title text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
grant select, insert, update, delete on public.guild_agent_conversations to authenticated;
grant all on public.guild_agent_conversations to service_role;
alter table public.guild_agent_conversations enable row level security;

create policy "Guild admins read conversations"
on public.guild_agent_conversations for select to authenticated
using (exists (
  select 1 from public.guild_agents a
  join public.guild_members gm on gm.guild_id = a.guild_id
  where a.id = guild_agent_conversations.agent_id
    and gm.user_id = auth.uid() and gm.role = 'ADMIN'
));

create policy "Members read their own conversations"
on public.guild_agent_conversations for select to authenticated
using (member_user_id = auth.uid());

create table public.guild_agent_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.guild_agent_conversations(id) on delete cascade,
  role text not null,
  content text not null,
  tool_calls jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.guild_agent_messages to authenticated;
grant all on public.guild_agent_messages to service_role;
alter table public.guild_agent_messages enable row level security;

create index guild_agent_messages_conv_idx on public.guild_agent_messages (conversation_id, created_at);

create policy "Guild admins read messages"
on public.guild_agent_messages for select to authenticated
using (exists (
  select 1 from public.guild_agent_conversations c
  join public.guild_agents a on a.id = c.agent_id
  join public.guild_members gm on gm.guild_id = a.guild_id
  where c.id = guild_agent_messages.conversation_id
    and gm.user_id = auth.uid() and gm.role = 'ADMIN'
));

create policy "Conversation owners read messages"
on public.guild_agent_messages for select to authenticated
using (exists (
  select 1 from public.guild_agent_conversations c
  where c.id = guild_agent_messages.conversation_id
    and c.member_user_id = auth.uid()
));
