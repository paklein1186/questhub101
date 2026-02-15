
-- 2. Create territory_closure table for fast ancestor/descendant queries
CREATE TABLE IF NOT EXISTS public.territory_closure (
  ancestor_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  descendant_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  depth INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ancestor_id, descendant_id)
);

-- Enable RLS
ALTER TABLE public.territory_closure ENABLE ROW LEVEL SECURITY;

-- Public read access (territory hierarchy is public data)
CREATE POLICY "Territory closure is publicly readable"
  ON public.territory_closure FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage territory closure"
  ON public.territory_closure FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_territory_closure_ancestor ON public.territory_closure(ancestor_id);
CREATE INDEX idx_territory_closure_descendant ON public.territory_closure(descendant_id);
CREATE INDEX idx_territory_closure_depth ON public.territory_closure(ancestor_id, depth);

-- Additional indexes on user_territories and user_topics for ecosystem queries
CREATE INDEX IF NOT EXISTS idx_user_territories_territory ON public.user_territories(territory_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_topics_topic ON public.user_topics(topic_id, user_id);

-- 3. Set parent_id hierarchy for existing territories
-- Europe (CONTINENT) is parent of countries
UPDATE public.territories SET level = 'CONTINENT' WHERE id = '616c15d6-ab0e-493b-8930-b020d3812937'; -- Europe
UPDATE public.territories SET level = 'GLOBAL' WHERE id = 'e6367bc0-70cf-4158-b302-0d95623daa6a'; -- Remote / Global

-- Set Europe as parent of countries
UPDATE public.territories SET parent_id = '616c15d6-ab0e-493b-8930-b020d3812937' WHERE id IN (
  '32f4a9f1-403d-4789-8526-4ab338157dc9', -- Belgium
  'fca5a8bc-86b6-4559-acc9-85996dfaa9ce', -- France
  '71666ec0-5bcb-447a-b879-7755db0549f7', -- Germany
  'a68ac5be-bb60-4237-bb29-827f191a3c54'  -- UK
);

-- Set Belgium as parent of Wallonia
UPDATE public.territories SET parent_id = '32f4a9f1-403d-4789-8526-4ab338157dc9' WHERE id = '76020619-2b2e-45a6-955f-6bfcfcdfa828'; -- Wallonia

-- Set France as parent of French regions
UPDATE public.territories SET parent_id = 'fca5a8bc-86b6-4559-acc9-85996dfaa9ce' WHERE id IN (
  '25604036-0aca-4faa-b8bb-ff93e1c1976c', -- Île-de-France
  'fa130057-c523-4205-91bb-89044d6c0c86'  -- Burgundy
);

-- Set UK as parent of Devon
UPDATE public.territories SET parent_id = 'a68ac5be-bb60-4237-bb29-827f191a3c54' WHERE id = '6124aced-43e4-416e-afa2-272435626c19'; -- Devon

-- Set regions as parents of towns
UPDATE public.territories SET parent_id = '76020619-2b2e-45a6-955f-6bfcfcdfa828' WHERE id IN (
  'a045bbf3-c79e-4343-8186-97fd3da86bab' -- Liège (in Wallonia)
);

UPDATE public.territories SET parent_id = '9b84125a-7796-4407-8540-d75cb95ecd91'
WHERE false; -- Brussels is already a town, skip for now

UPDATE public.territories SET parent_id = '32f4a9f1-403d-4789-8526-4ab338157dc9'
WHERE id = '9b84125a-7796-4407-8540-d75cb95ecd91'; -- Brussels under Belgium

UPDATE public.territories SET parent_id = '25604036-0aca-4faa-b8bb-ff93e1c1976c'
WHERE id = '32235c45-b9c7-4e1c-8468-cb9984e66c6b'; -- Paris under Île-de-France

UPDATE public.territories SET parent_id = 'fca5a8bc-86b6-4559-acc9-85996dfaa9ce'
WHERE id IN (
  '1fcb1e1f-76ad-4c17-a730-4369aacf549e', -- Marseille
  '909b0507-b50e-4d50-a810-06541a9a77a8'  -- Toulouse
);

UPDATE public.territories SET parent_id = 'fa130057-c523-4205-91bb-89044d6c0c86'
WHERE id = '90065780-7951-4da5-ad22-146347705733'; -- Joigny under Burgundy

-- Set Remote/Global as ultimate parent of Europe
UPDATE public.territories SET parent_id = 'e6367bc0-70cf-4158-b302-0d95623daa6a'
WHERE id = '616c15d6-ab0e-493b-8930-b020d3812937'; -- Europe under Global

-- 4. Create a function to rebuild closure table from parent_id hierarchy
CREATE OR REPLACE FUNCTION public.rebuild_territory_closure()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Clear existing closure rows
  DELETE FROM territory_closure;
  
  -- Insert self-references (depth 0)
  INSERT INTO territory_closure (ancestor_id, descendant_id, depth)
  SELECT id, id, 0 FROM territories WHERE is_deleted = false;
  
  -- Iteratively add ancestor-descendant pairs
  -- We loop until no new rows are added
  LOOP
    INSERT INTO territory_closure (ancestor_id, descendant_id, depth)
    SELECT tc.ancestor_id, t.id, tc.depth + 1
    FROM territory_closure tc
    JOIN territories t ON t.parent_id = tc.descendant_id AND t.is_deleted = false
    WHERE NOT EXISTS (
      SELECT 1 FROM territory_closure existing
      WHERE existing.ancestor_id = tc.ancestor_id AND existing.descendant_id = t.id
    );
    
    EXIT WHEN NOT FOUND;
  END LOOP;
END;
$$;

-- 5. Run the rebuild to seed the closure table
SELECT public.rebuild_territory_closure();
