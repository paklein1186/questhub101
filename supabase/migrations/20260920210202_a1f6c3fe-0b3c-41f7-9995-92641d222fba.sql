-- « Lieu physique » : case cochée par les admins d'une guilde (tiers-lieu, coliving…) pour que
-- Space2 la lise comme un LIEU. Les autres guildes taguées Third Spaces lui parviennent comme
-- « organisations » : elles nourrissent ses réponses sans entrer dans sa galerie de lieux.
ALTER TABLE public.guilds ADD COLUMN is_physical_place boolean NOT NULL DEFAULT false;

-- Les guildes créées depuis Space2 sont des lieux.
UPDATE public.guilds SET is_physical_place = true WHERE auto_created_by_agent_id IS NOT NULL;

-- Date du dernier envoi des objets Third Spaces à l'agent (envoi incrémental).
ALTER TABLE public.agents ADD COLUMN objects_cursor timestamptz;