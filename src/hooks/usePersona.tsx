import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getLabel, type PersonaType } from "@/lib/personaLabels";
import { useCallback } from "react";

/**
 * Hook that provides the current user's persona type
 * and a helper to get adaptive labels.
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

  const label = useCallback(
    (key: string) => getLabel(key, persona),
    [persona]
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

  return { persona, label, updatePersona };
}
