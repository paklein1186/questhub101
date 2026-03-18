-- ═══════════════════════════════════════════════════════════
-- Refactor milestones into 4-phase journey model
-- Phase 1: Discover (onboarding)
-- Phase 2: Contribute (first impact)
-- Phase 3: Create (become an actor)
-- Phase 4: Structure (leadership)
-- ═══════════════════════════════════════════════════════════

-- Add phase column to milestones
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'discover'
  CHECK (phase IN ('discover', 'contribute', 'create', 'structure'));

-- Add subtitle for sub-label under each milestone
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS subtitle TEXT;

-- ─── Update existing milestones with phases ───────────────

-- Phase 1: Discover
UPDATE public.milestones SET phase = 'discover', sort_order = 1, subtitle = 'Make a great first impression'
  WHERE code = 'complete_profile';
UPDATE public.milestones SET phase = 'discover', sort_order = 2, title = 'Explore 3 guilds or territories', description = 'Browse guilds, territories, or quests to discover what exists.', subtitle = 'See what is out there', icon = '🔍', reward_type = 'XP', reward_amount = 15
  WHERE code = 'add_spoken_languages';
UPDATE public.milestones SET phase = 'discover', sort_order = 3, title = 'Join your first guild', subtitle = 'Find your people'
  WHERE code = 'join_first_guild';

-- Phase 2: Contribute
UPDATE public.milestones SET phase = 'contribute', sort_order = 10, title = 'Respond to an opportunity', description = 'Answer a quest need or submit a proposal.', subtitle = 'Make your first contribution', icon = '🧩', reward_type = 'XP', reward_amount = 40
  WHERE code = 'collaborate_pod';
UPDATE public.milestones SET phase = 'contribute', sort_order = 11, title = 'Add a knowledge entry', description = 'Share knowledge in a territory or guild memory.', subtitle = 'Feed the collective brain', icon = '🧠', reward_type = 'XP', reward_amount = 30
  WHERE code = 'contribute_territory';
UPDATE public.milestones SET phase = 'contribute', sort_order = 12, title = 'Join an event or ritual', description = 'Participate in a community event, workshop, or ritual.', subtitle = 'Show up and connect'
  WHERE code = 'attend_event';
UPDATE public.milestones SET phase = 'contribute', sort_order = 13, title = 'React or comment in a discussion', description = 'Engage in a guild or quest discussion thread.', subtitle = 'Be part of the conversation', icon = '💬', reward_type = 'XP', reward_amount = 10
  WHERE code = 'invite_friend';

-- Phase 3: Create
UPDATE public.milestones SET phase = 'create', sort_order = 20, title = 'Launch your first quest', subtitle = 'Start something meaningful'
  WHERE code = 'create_first_quest';
UPDATE public.milestones SET phase = 'create', sort_order = 21, title = 'Offer a service', subtitle = 'Share your expertise'
  WHERE code = 'publish_service';
UPDATE public.milestones SET phase = 'create', sort_order = 22, title = 'Invite a relevant collaborator', description = 'Invite someone who can contribute to a quest or guild.', subtitle = 'Grow the team', icon = '👥', reward_type = 'CREDITS', reward_amount = 30
  WHERE code = 'publish_course';
UPDATE public.milestones SET phase = 'create', sort_order = 23, title = 'Fund or contribute to fundraising', description = 'Back a quest with coins or $CTG.', subtitle = 'Put skin in the game', icon = '💰', reward_type = 'XP', reward_amount = 50
  WHERE code = 'become_shareholder';

-- Phase 4: Structure
UPDATE public.milestones SET phase = 'structure', sort_order = 30, title = 'Create or structure a guild', description = 'Found a guild or take an active structuring role.', subtitle = 'Build the container', icon = '🏛️', reward_type = 'XP', reward_amount = 60
  WHERE code = 'creative_artwork_quest';
UPDATE public.milestones SET phase = 'structure', sort_order = 31, title = 'Take a governance role', description = 'Become admin, steward, or active in governance decisions.', subtitle = 'Step into leadership', icon = '🗳️', reward_type = 'XP', reward_amount = 50
  WHERE code = 'join_creative_circle';
UPDATE public.milestones SET phase = 'structure', sort_order = 32, title = 'Contribute to governance', description = 'Vote on a decision or propose an amendment.', subtitle = 'Shape the rules', icon = '📊', reward_type = 'XP', reward_amount = 40
  WHERE code = 'creative_class';

-- Disable legacy milestones that don't fit the new model
UPDATE public.milestones SET is_enabled = false WHERE code IN (
  'impact_territory_memory',
  'impact_quest',
  'impact_guild',
  'host_workshop'
);
