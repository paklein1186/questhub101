-- Remove any remaining duplicates before adding constraint
DELETE FROM guild_members a USING guild_members b
WHERE a.id > b.id AND a.guild_id = b.guild_id AND a.user_id = b.user_id;

-- Add unique constraint to prevent duplicate memberships
ALTER TABLE guild_members ADD CONSTRAINT guild_members_guild_user_unique UNIQUE (guild_id, user_id);