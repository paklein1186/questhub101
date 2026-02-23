
-- Prevent duplicate default Source roles per entity
CREATE UNIQUE INDEX uq_entity_roles_source
ON public.entity_roles (entity_type, entity_id, name)
WHERE is_default = true;
