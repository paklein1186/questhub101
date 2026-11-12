-- Des descriptions récupérées automatiquement sur des sites protégés par une connexion étaient du simple
-- texte de porte d'entrée (« Connect for action »), ensuite traduit (« Connectez-vous pour agir »).
-- On les vide, avec leurs traductions : la fiche n'affiche plus rien plutôt qu'une fausse description.
WITH bad AS (
  SELECT id FROM public.guilds
  WHERE description ~* '^\s*(connect(ez-vous)?( for| pour)? ?(action|agir)?|log ?in|sign ?(in|up)|login)\W*$'
)
DELETE FROM public.content_translations
WHERE entity_type = 'GUILD' AND field_name = 'description' AND entity_id::text IN (SELECT id::text FROM bad);

UPDATE public.guilds SET description = NULL
WHERE description ~* '^\s*(connect(ez-vous)?( for| pour)? ?(action|agir)?|log ?in|sign ?(in|up)|login)\W*$';

UPDATE public.companies SET description = NULL
WHERE description ~* '^\s*(connect(ez-vous)?( for| pour)? ?(action|agir)?|log ?in|sign ?(in|up)|login)\W*$';
