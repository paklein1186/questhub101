/**
 * Canonical mapping from milestone codes → actionable routes.
 * Used by MilestonesHub, MilestoneTracker, MilestoneJourney.
 */
export const MILESTONE_ROUTES: Record<string, { label: string; to: string }> = {
  // ── Phase 1: Discover ──────────────────────────────────────
  complete_profile_v2:    { label: "Edit your profile",        to: "/profile/edit" },
  explore_guilds:         { label: "Browse guilds",            to: "/explore?tab=entities" },
  join_first_guild_v2:    { label: "Browse guilds",            to: "/explore?tab=entities" },
  first_comment:          { label: "Go to feed",               to: "/feed" },
  follow_3_quests:        { label: "Browse quests",            to: "/explore?tab=quests" },
  visit_territory:        { label: "Explore territories",      to: "/territories" },
  read_guide:             { label: "Read guides",              to: "/guides" },
  set_spoken_languages:   { label: "Edit profile",             to: "/profile/edit" },
  explore_services:       { label: "Browse services",          to: "/explore?tab=services" },
  view_user_profile:      { label: "Explore people",           to: "/explore/users" },
  follow_user:            { label: "Explore people",           to: "/explore/users" },
  send_first_message:     { label: "Open inbox",               to: "/inbox" },

  // ── Phase 2: Contribute ────────────────────────────────────
  respond_opportunity:    { label: "Browse opportunities",     to: "/opportunities" },
  join_quest:             { label: "Browse quests",            to: "/explore?tab=quests" },
  complete_subtask:       { label: "Go to work hub",           to: "/work" },
  log_contribution:       { label: "Go to work hub",           to: "/work" },
  add_knowledge:          { label: "Explore territories",      to: "/territories" },
  join_event:             { label: "Browse events",            to: "/calendar" },
  react_discussion:       { label: "Go to feed",               to: "/feed" },
  help_or_resource:       { label: "Browse quests",            to: "/explore?tab=quests" },
  fund_quest:             { label: "Browse quests",            to: "/explore?tab=quests" },
  give_trust:             { label: "Explore people",           to: "/explore/users" },
  book_service:           { label: "Browse services",          to: "/explore?tab=services" },
  join_second_guild:      { label: "Browse guilds",            to: "/explore?tab=entities" },
  complete_5_subtasks:    { label: "Go to work hub",           to: "/work" },
  get_contribution_verified: { label: "Go to work hub",        to: "/work" },
  follow_quest_v2:        { label: "Browse quests",            to: "/explore?tab=quests" },

  // ── Phase 3: Create ────────────────────────────────────────
  create_quest:           { label: "Create a quest",           to: "/quests/new" },
  publish_service_v2:     { label: "Create a service",         to: "/services/new" },
  invite_collaborator:    { label: "My guilds",                to: "/me/guilds" },
  post_update:            { label: "Go to work hub",           to: "/work" },
  create_event:           { label: "My guilds",                to: "/me/guilds" },
  create_course:          { label: "Create a course",          to: "/courses/new" },
  open_fundraising:       { label: "Go to work hub",           to: "/work" },
  set_availability:       { label: "Set availability",         to: "/me/availability" },
  add_quest_needs:        { label: "Go to work hub",           to: "/work" },
  receive_first_proposal: { label: "Go to work hub",           to: "/work" },
  quest_with_3_participants: { label: "Go to work hub",        to: "/work" },
  complete_first_quest:   { label: "Go to work hub",           to: "/work" },
  earn_100_xp:            { label: "View your XP",             to: "/me/xp" },

  // ── Phase 4: Structure ─────────────────────────────────────
  create_guild_v2:        { label: "Create a guild",           to: "/create/guild-info" },
  become_admin:           { label: "My guilds",                to: "/me/guilds" },
  governance_vote:        { label: "My guilds",                to: "/me/guilds" },
  setup_contract:         { label: "Go to work hub",           to: "/work" },
  configure_exit:         { label: "My guilds",                to: "/me/guilds" },
  create_partnership:     { label: "My guilds",                to: "/me/guilds" },
  freeze_pie:             { label: "Go to work hub",           to: "/work" },
  distribute_rewards:     { label: "Go to work hub",           to: "/work" },
  guild_10_members:       { label: "My guilds",                to: "/me/guilds" },
  become_shareholder_v2:  { label: "View shares",              to: "/shares" },

  // ── Legacy codes (backward compat) ─────────────────────────
  complete_profile:       { label: "Edit profile",             to: "/profile/edit" },
  add_spoken_languages:   { label: "Edit profile",             to: "/profile/edit" },
  join_first_guild:       { label: "Browse guilds",            to: "/explore?tab=entities" },
  create_first_quest:     { label: "Create a quest",           to: "/quests/new" },
  publish_service:        { label: "Create a service",         to: "/services/new" },
  collaborate_pod:        { label: "Browse quests",            to: "/explore?tab=quests" },
  contribute_territory:   { label: "Explore territories",      to: "/territories" },
  attend_event:           { label: "Browse events",            to: "/calendar" },
  become_shareholder:     { label: "View shares",              to: "/shares" },
  publish_course:         { label: "Create a course",          to: "/courses/new" },
  creative_class:         { label: "Create a course",          to: "/courses/new" },
  creative_artwork_quest: { label: "Create a quest",           to: "/quests/new" },
  impact_quest:           { label: "Create a quest",           to: "/quests/new" },
  impact_territory_memory:{ label: "Explore territories",      to: "/territories" },
  impact_guild:           { label: "Browse guilds",            to: "/explore?tab=entities" },
  join_creative_circle:   { label: "Browse guilds",            to: "/explore?tab=entities" },
  host_workshop:          { label: "My guilds",                to: "/me/guilds" },
  invite_friend:          { label: "My guilds",                to: "/me/guilds" },
};

/** Phase display metadata */
export const PHASE_META: Record<string, { label: string; emoji: string; color: string }> = {
  discover:   { label: "Discover",    emoji: "🌱", color: "text-emerald-600" },
  contribute: { label: "Contribute",  emoji: "🔗", color: "text-blue-600" },
  create:     { label: "Create",      emoji: "🚀", color: "text-purple-600" },
  structure:  { label: "Structure",   emoji: "🏛️", color: "text-amber-600" },
};
