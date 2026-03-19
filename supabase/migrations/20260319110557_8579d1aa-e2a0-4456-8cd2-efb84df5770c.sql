
-- Disable legacy milestones that have v2 replacements or are duplicates
UPDATE milestones SET is_enabled = false WHERE code IN (
  'complete_profile',
  'add_spoken_languages', 
  'join_first_guild',
  'create_first_quest',
  'publish_service',
  'collaborate_pod',
  'contribute_territory',
  'attend_event',
  'become_shareholder',
  'publish_course',
  'creative_artwork_quest',
  'join_creative_circle',
  'creative_class',
  'impact_territory_memory',
  'impact_quest',
  'impact_guild',
  'host_workshop',
  'invite_friend'
);
