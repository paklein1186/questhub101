-- Mode « approfondi » d'un agent externe (ex. Space2 : réponse plus longue avec un modèle plus puissant).
-- Prix en crédits par message, fixé par le propriétaire (coût brut du modèle + marge) ; NULL = pas de mode approfondi.
-- Il n'est jamais gratuit : ni « gratuit pour » ni quota d'abonnement ne s'y appliquent.
ALTER TABLE public.agents ADD COLUMN deep_price integer CHECK (deep_price IS NULL OR deep_price >= 0);
