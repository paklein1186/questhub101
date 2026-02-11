import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getLabel, type PersonaType, type LexiconMode } from "@/lib/personaLabels";
import { useCallback, useMemo } from "react";

/**
 * Hook that provides the current user's persona type, lexicon override,
 * and a helper to get adaptive labels.
 *
 * The lexicon override (stored in localStorage) lets users switch
 * the UI language/world without changing their underlying persona.
 */
export function usePersona() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: persona = "UNSET" as PersonaType } = useQuery({
    queryKey: ["user-persona", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("persona_type")
        .eq("user_id", user!.id)
        .single();
      return ((data as any)?.persona_type as PersonaType) || "UNSET";
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Lexicon override stored in localStorage (no DB column needed)
  const { data: lexiconOverride } = useQuery({
    queryKey: ["lexicon-override", user?.id],
    queryFn: () => {
      if (!user?.id) return null;
      const stored = localStorage.getItem(`lexicon-override-${user.id}`);
      return (stored as LexiconMode | null);
    },
    enabled: !!user?.id,
    staleTime: Infinity,
  });

  // The effective mode for label resolution: override > persona > UNSET
  const effectiveMode: PersonaType | LexiconMode = useMemo(() => {
    if (lexiconOverride) return lexiconOverride;
    return persona;
  }, [lexiconOverride, persona]);

  const label = useCallback(
    (key: string) => getLabel(key, effectiveMode),
    [effectiveMode]
  );

  const updatePersona = useCallback(
    async (newPersona: PersonaType, source = "manual") => {
      if (!user?.id) return;
      await supabase
        .from("profiles")
        .update({
          persona_type: newPersona,
          persona_source: source,
        } as any)
        .eq("user_id", user.id);
      qc.invalidateQueries({ queryKey: ["user-persona", user.id] });
    },
    [user?.id, qc]
  );

  const setLexiconOverride = useCallback(
    (mode: LexiconMode | null) => {
      if (!user?.id) return;
      if (mode) {
        localStorage.setItem(`lexicon-override-${user.id}`, mode);
      } else {
        localStorage.removeItem(`lexicon-override-${user.id}`);
      }
      qc.invalidateQueries({ queryKey: ["lexicon-override", user.id] });
    },
    [user?.id, qc]
  );

  return { persona, effectiveMode, lexiconOverride: lexiconOverride ?? null, label, updatePersona, setLexiconOverride };
}