ALTER TABLE public.quests
ADD CONSTRAINT quests_company_id_fkey
FOREIGN KEY (company_id) REFERENCES public.companies(id);