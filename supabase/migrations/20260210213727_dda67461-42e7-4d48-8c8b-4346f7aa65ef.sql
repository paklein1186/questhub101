
ALTER TABLE public.guilds
ADD COLUMN features_config JSONB NOT NULL DEFAULT '{"kanbanBoard": true, "docsSpace": true, "events": true, "applicationProcess": true, "subtasks": true}'::jsonb;
