-- Migrate any quest with a removed nature to PROJECT
UPDATE public.quests
SET quest_nature = 'PROJECT'
WHERE quest_nature IN ('ACTION', 'EVENT', 'LEARNING', 'SERVICE', 'RESOURCE', 'FUNDING', 'PARTNERSHIP', 'CONTACT', 'PLACE');