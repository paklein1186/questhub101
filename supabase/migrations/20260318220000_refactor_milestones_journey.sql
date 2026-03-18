-- ═══════════════════════════════════════════════════════════
-- Refactor milestones: 50 actions in 4-phase dynamic journey
-- Completed milestones disappear from the active list
-- Phase 1: Discover (12) — getting oriented
-- Phase 2: Contribute (15) — first real impact
-- Phase 3: Create (13) — become an actor
-- Phase 4: Structure (10) — leadership & governance
-- ═══════════════════════════════════════════════════════════

-- Add phase + subtitle columns
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'discover'
  CHECK (phase IN ('discover', 'contribute', 'create', 'structure'));
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS subtitle TEXT;

-- Disable ALL old milestones (clean slate)
UPDATE public.milestones SET is_enabled = false;

-- ═══════════════════════════════════════════════════════════
-- PHASE 1: DISCOVER (getting oriented, 12 milestones)
-- ═══════════════════════════════════════════════════════════

INSERT INTO public.milestones (code, title, description, subtitle, reward_type, reward_amount, persona_visibility, trigger_type, trigger_config, sort_order, icon, phase) VALUES
  ('complete_profile_v2', 'Complete your profile', 'Add your name, bio, avatar, and headline.', 'First impressions matter', 'XP', 25, 'ALL', 'SYSTEM_STATE', '{"check": "profile_completeness", "threshold": 70}', 1, '👤', 'discover'),
  ('explore_guilds', 'Explore 3 guilds', 'Visit at least 3 guild pages to see what exists.', 'See what is out there', 'XP', 15, 'ALL', 'USER_ACTION', '{"check": "guild_views_count", "min": 3}', 2, '🔍', 'discover'),
  ('join_first_guild_v2', 'Join your first guild', 'Become a member of a guild.', 'Find your people', 'XP', 30, 'ALL', 'USER_ACTION', '{"check": "guild_membership_count", "min": 1}', 3, '🛡️', 'discover'),
  ('first_comment', 'Leave your first comment', 'Comment on a quest update or discussion thread.', 'Break the ice', 'XP', 10, 'ALL', 'USER_ACTION', '{"check": "comment_count", "min": 1}', 4, '💬', 'discover'),
  ('follow_3_quests', 'Follow 3 quests', 'Follow quests that interest you to stay updated.', 'Track what matters', 'XP', 10, 'ALL', 'USER_ACTION', '{"check": "quest_follow_count", "min": 3}', 5, '👁️', 'discover'),
  ('visit_territory', 'Visit a territory page', 'Explore a territory or bioregion.', 'Discover your local ecosystem', 'XP', 10, 'ALL', 'USER_ACTION', '{"check": "territory_views_count", "min": 1}', 6, '🗺️', 'discover'),
  ('read_guide', 'Read a platform guide', 'Visit the guides page and learn how things work.', 'Get oriented', 'XP', 5, 'ALL', 'USER_ACTION', '{"check": "guide_views_count", "min": 1}', 7, '📖', 'discover'),
  ('set_spoken_languages', 'Set your spoken languages', 'Add at least one language to your profile.', 'Help others find you', 'XP', 5, 'ALL', 'USER_ACTION', '{"check": "spoken_languages_count", "min": 1}', 8, '🌍', 'discover'),
  ('explore_services', 'Browse available services', 'Check out services offered by community members.', 'See what is on offer', 'XP', 5, 'ALL', 'USER_ACTION', '{"check": "service_views_count", "min": 1}', 9, '🛒', 'discover'),
  ('view_user_profile', 'Visit another member''s profile', 'Check out another community member''s profile.', 'Get to know people', 'XP', 5, 'ALL', 'USER_ACTION', '{"check": "user_profile_views_count", "min": 1}', 10, '👀', 'discover'),
  ('follow_user', 'Follow a community member', 'Follow someone whose work interests you.', 'Build your network', 'XP', 5, 'ALL', 'USER_ACTION', '{"check": "user_follow_count", "min": 1}', 11, '🤝', 'discover'),
  ('send_first_message', 'Send your first direct message', 'Reach out to someone via the inbox.', 'Start a conversation', 'XP', 10, 'ALL', 'USER_ACTION', '{"check": "dm_sent_count", "min": 1}', 12, '✉️', 'discover');

-- ═══════════════════════════════════════════════════════════
-- PHASE 2: CONTRIBUTE (first impact, 15 milestones)
-- ═══════════════════════════════════════════════════════════

INSERT INTO public.milestones (code, title, description, subtitle, reward_type, reward_amount, persona_visibility, trigger_type, trigger_config, sort_order, icon, phase) VALUES
  ('respond_opportunity', 'Respond to an opportunity', 'Submit a proposal or answer a quest need.', 'Make your first move', 'XP', 40, 'ALL', 'USER_ACTION', '{"check": "proposal_count", "min": 1}', 20, '🧩', 'contribute'),
  ('join_quest', 'Join a quest as participant', 'Become a contributor on someone else''s quest.', 'Join the mission', 'XP', 25, 'ALL', 'USER_ACTION', '{"check": "quest_participation_count", "min": 1}', 21, '⚔️', 'contribute'),
  ('complete_subtask', 'Complete your first subtask', 'Mark a task as done in a quest.', 'Ship something', 'XP', 30, 'ALL', 'USER_ACTION', '{"check": "subtask_completed_count", "min": 1}', 22, '✅', 'contribute'),
  ('log_contribution', 'Log a contribution', 'Record a contribution (time, expense, or resource).', 'Track your value', 'XP', 20, 'ALL', 'USER_ACTION', '{"check": "contribution_logged_count", "min": 1}', 23, '📝', 'contribute'),
  ('add_knowledge', 'Add a knowledge entry', 'Share knowledge in a territory or guild memory.', 'Feed the collective brain', 'XP', 30, 'ALL', 'USER_ACTION', '{"check": "territory_memory_count", "min": 1}', 24, '🧠', 'contribute'),
  ('join_event', 'Attend an event or ritual', 'Register for and attend a community gathering.', 'Show up and connect', 'CREDITS', 20, 'ALL', 'USER_ACTION', '{"check": "event_attendance_count", "min": 1}', 25, '📅', 'contribute'),
  ('react_discussion', 'Participate in a guild discussion', 'Post in a discussion room or reply to a thread.', 'Be part of the conversation', 'XP', 10, 'ALL', 'USER_ACTION', '{"check": "discussion_post_count", "min": 1}', 26, '💬', 'contribute'),
  ('help_or_resource', 'Offer help or a resource', 'Propose your skills or resources on a quest.', 'Be generous', 'XP', 20, 'ALL', 'USER_ACTION', '{"check": "help_offered_count", "min": 1}', 27, '🤲', 'contribute'),
  ('fund_quest', 'Fund a quest', 'Contribute coins or $CTG to a quest campaign.', 'Put skin in the game', 'XP', 35, 'ALL', 'USER_ACTION', '{"check": "quest_funding_count", "min": 1}', 28, '💰', 'contribute'),
  ('give_trust', 'Give trust to someone', 'Give a trust signal to a person, guild, or quest.', 'Build social capital', 'XP', 15, 'ALL', 'USER_ACTION', '{"check": "trust_given_count", "min": 1}', 29, '🤝', 'contribute'),
  ('book_service', 'Book a service', 'Book a coaching, mentoring, or consulting session.', 'Learn from someone', 'XP', 15, 'ALL', 'USER_ACTION', '{"check": "booking_count", "min": 1}', 30, '📞', 'contribute'),
  ('join_second_guild', 'Join a second guild', 'Become a member of a second guild.', 'Expand your reach', 'XP', 15, 'ALL', 'USER_ACTION', '{"check": "guild_membership_count", "min": 2}', 31, '🛡️', 'contribute'),
  ('complete_5_subtasks', 'Complete 5 subtasks', 'Build momentum by finishing 5 tasks.', 'Build a track record', 'XP', 40, 'ALL', 'USER_ACTION', '{"check": "subtask_completed_count", "min": 5}', 32, '🏃', 'contribute'),
  ('get_contribution_verified', 'Get a contribution verified', 'Have one of your contributions approved.', 'Earn recognition', 'XP', 25, 'ALL', 'USER_ACTION', '{"check": "verified_contribution_count", "min": 1}', 33, '✔️', 'contribute'),
  ('follow_quest_v2', 'Follow a quest you care about', 'Follow a quest to receive updates.', 'Stay in the loop', 'XP', 5, 'ALL', 'USER_ACTION', '{"check": "quest_follow_count", "min": 1}', 34, '👁️', 'contribute');

-- ═══════════════════════════════════════════════════════════
-- PHASE 3: CREATE (become an actor, 13 milestones)
-- ═══════════════════════════════════════════════════════════

INSERT INTO public.milestones (code, title, description, subtitle, reward_type, reward_amount, persona_visibility, trigger_type, trigger_config, sort_order, icon, phase) VALUES
  ('create_quest', 'Launch your first quest', 'Create a quest and publish it.', 'Start something meaningful', 'CREDITS', 50, 'ALL', 'USER_ACTION', '{"check": "quest_created_count", "min": 1}', 40, '🎯', 'create'),
  ('publish_service_v2', 'Offer a service', 'Publish a service (coaching, consulting, skills).', 'Share your expertise', 'XP', 20, 'ALL', 'USER_ACTION', '{"check": "service_count", "min": 1}', 41, '🛒', 'create'),
  ('invite_collaborator', 'Invite a collaborator', 'Invite someone to join a quest or guild.', 'Grow the team', 'CREDITS', 30, 'ALL', 'USER_ACTION', '{"check": "invite_sent_count", "min": 1}', 42, '👥', 'create'),
  ('post_update', 'Post a quest update', 'Share a milestone, call for help, or reflection.', 'Keep people informed', 'XP', 15, 'ALL', 'USER_ACTION', '{"check": "quest_update_count", "min": 1}', 43, '📢', 'create'),
  ('create_event', 'Organize an event', 'Create a workshop, meetup, or ritual.', 'Bring people together', 'XP', 30, 'ALL', 'USER_ACTION', '{"check": "event_created_count", "min": 1}', 44, '🎪', 'create'),
  ('create_course', 'Create a course', 'Publish a course with at least one lesson.', 'Teach what you know', 'XP', 40, 'ALL', 'USER_ACTION', '{"check": "published_course_count", "min": 1}', 45, '🎓', 'create'),
  ('open_fundraising', 'Open a fundraising campaign', 'Enable fundraising on one of your quests.', 'Rally resources', 'XP', 25, 'ALL', 'USER_ACTION', '{"check": "fundraising_opened_count", "min": 1}', 46, '📣', 'create'),
  ('set_availability', 'Set your availability', 'Configure your booking availability for services.', 'Open your calendar', 'XP', 10, 'ALL', 'USER_ACTION', '{"check": "availability_set", "threshold": 1}', 47, '📆', 'create'),
  ('add_quest_needs', 'Define quest needs', 'Add open needs to your quest for contributors.', 'Tell people what you need', 'XP', 15, 'ALL', 'USER_ACTION', '{"check": "quest_needs_count", "min": 1}', 48, '💡', 'create'),
  ('receive_first_proposal', 'Receive your first proposal', 'Someone responds to your quest needs.', 'Your quest attracts talent', 'XP', 20, 'ALL', 'USER_ACTION', '{"check": "proposals_received_count", "min": 1}', 49, '📨', 'create'),
  ('quest_with_3_participants', 'Have 3 participants on a quest', 'Build a team of at least 3 people.', 'Build a real team', 'XP', 30, 'ALL', 'USER_ACTION', '{"check": "quest_max_participants", "min": 3}', 50, '👥', 'create'),
  ('complete_first_quest', 'Complete your first quest', 'Mark a quest you created as completed.', 'Ship the mission', 'XP', 50, 'ALL', 'USER_ACTION', '{"check": "quest_completed_count", "min": 1}', 51, '🏆', 'create'),
  ('earn_100_xp', 'Earn 100 XP total', 'Accumulate 100 XP through your activities.', 'Level up', 'CREDITS', 25, 'ALL', 'SYSTEM_STATE', '{"check": "total_xp", "threshold": 100}', 52, '⭐', 'create');

-- ═══════════════════════════════════════════════════════════
-- PHASE 4: STRUCTURE (leadership, 10 milestones)
-- ═══════════════════════════════════════════════════════════

INSERT INTO public.milestones (code, title, description, subtitle, reward_type, reward_amount, persona_visibility, trigger_type, trigger_config, sort_order, icon, phase) VALUES
  ('create_guild_v2', 'Create a guild', 'Found a new guild or collective.', 'Build the container', 'XP', 60, 'ALL', 'USER_ACTION', '{"check": "guild_created_count", "min": 1}', 60, '🏛️', 'structure'),
  ('become_admin', 'Become a guild admin', 'Take on admin responsibilities in a guild.', 'Step into leadership', 'XP', 40, 'ALL', 'USER_ACTION', '{"check": "guild_admin_count", "min": 1}', 61, '👑', 'structure'),
  ('governance_vote', 'Vote on a governance decision', 'Cast your vote in a guild decision poll.', 'Shape the rules', 'XP', 25, 'ALL', 'USER_ACTION', '{"check": "decision_vote_count", "min": 1}', 62, '🗳️', 'structure'),
  ('setup_contract', 'Set up a collaboration agreement', 'Create a contract on a quest using the wizard.', 'Formalize collaboration', 'XP', 35, 'ALL', 'USER_ACTION', '{"check": "contract_created_count", "min": 1}', 63, '📄', 'structure'),
  ('configure_exit', 'Configure exit protocol', 'Set up exit terms for a guild.', 'Protect contributors', 'XP', 20, 'ALL', 'USER_ACTION', '{"check": "exit_protocol_configured", "threshold": 1}', 64, '🚪', 'structure'),
  ('create_partnership', 'Create a partnership', 'Establish a partnership between two entities.', 'Connect ecosystems', 'XP', 30, 'ALL', 'USER_ACTION', '{"check": "partnership_count", "min": 1}', 65, '🤝', 'structure'),
  ('freeze_pie', 'Freeze a value pie', 'Lock the contribution distribution on a quest.', 'Finalize value sharing', 'XP', 30, 'ALL', 'USER_ACTION', '{"check": "pie_frozen_count", "min": 1}', 66, '🥧', 'structure'),
  ('distribute_rewards', 'Distribute rewards', 'Execute a distribution to quest contributors.', 'Pay the team', 'XP', 40, 'ALL', 'USER_ACTION', '{"check": "distribution_count", "min": 1}', 67, '💎', 'structure'),
  ('guild_10_members', 'Grow a guild to 10 members', 'Build a guild with at least 10 members.', 'Build community', 'XP', 50, 'ALL', 'USER_ACTION', '{"check": "guild_max_members", "min": 10}', 68, '🌳', 'structure'),
  ('become_shareholder_v2', 'Become a cooperative shareholder', 'Purchase shares in the cooperative.', 'Own a piece', 'BADGE', 0, 'ALL', 'USER_ACTION', '{"check": "shareholding_count", "min": 1}', 69, '💎', 'structure');
