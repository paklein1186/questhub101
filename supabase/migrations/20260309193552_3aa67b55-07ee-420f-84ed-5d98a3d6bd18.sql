
-- Remove all trust-related credit reward triggers
DROP TRIGGER IF EXISTS trg_reward_trust_edge_creator ON public.trust_edges;
DROP TRIGGER IF EXISTS trg_trust_edge_useful_threshold ON public.trust_edge_useful_marks;
DROP TRIGGER IF EXISTS trg_reward_trust_edge_renewal ON public.trust_edges;
DROP TRIGGER IF EXISTS trg_reward_mutual_trust ON public.trust_edges;
DROP TRIGGER IF EXISTS trg_reward_facilitator_trust ON public.trust_edges;
DROP TRIGGER IF EXISTS trg_reward_steward_receiver ON public.trust_edges;

-- Drop the trigger functions
DROP FUNCTION IF EXISTS public.reward_trust_edge_creator() CASCADE;
DROP FUNCTION IF EXISTS public.check_trust_edge_useful_threshold() CASCADE;
DROP FUNCTION IF EXISTS public.reward_trust_edge_renewal() CASCADE;
DROP FUNCTION IF EXISTS public.reward_mutual_trust() CASCADE;
DROP FUNCTION IF EXISTS public.reward_facilitator_trust() CASCADE;
DROP FUNCTION IF EXISTS public.reward_steward_receiver() CASCADE;
