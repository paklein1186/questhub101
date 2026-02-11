import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SpokenLanguageRow {
  id: string;
  user_id: string;
  language_code: string;
  sort_order: number;
}

const AVAILABLE_LANGUAGES = [
  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
  { code: "fr", label: "French", native: "Français", flag: "🇫🇷" },
  { code: "es", label: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "de", label: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italian", native: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Portuguese", native: "Português", flag: "🇧🇷" },
  { code: "nl", label: "Dutch", native: "Nederlands", flag: "🇳🇱" },
  { code: "sv", label: "Swedish", native: "Svenska", flag: "🇸🇪" },
];

export { AVAILABLE_LANGUAGES };

/**
 * Hook to manage user spoken languages.
 * Returns current spoken language codes, available languages, and mutation helpers.
 */
export function useSpokenLanguages(userId?: string) {
  const { user: authUser } = useAuth();
  const uid = userId || authUser?.id;
  const qc = useQueryClient();

  const { data: spokenLanguages = [], isLoading } = useQuery({
    queryKey: ["spoken-languages", uid],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_spoken_languages")
        .select("id, user_id, language_code, sort_order")
        .eq("user_id", uid!)
        .order("sort_order", { ascending: true });
      return (data ?? []) as SpokenLanguageRow[];
    },
    enabled: !!uid,
  });

  const spokenCodes = spokenLanguages.map((l) => l.language_code);

  const saveMutation = useMutation({
    mutationFn: async (codes: string[]) => {
      if (!uid) return;
      // Delete existing
      await supabase.from("user_spoken_languages").delete().eq("user_id", uid);
      // Insert new
      if (codes.length > 0) {
        await supabase.from("user_spoken_languages").insert(
          codes.map((code, i) => ({
            user_id: uid,
            language_code: code,
            sort_order: i,
          }))
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["spoken-languages", uid] });
    },
  });

  return {
    spokenLanguages,
    spokenCodes,
    isLoading,
    saveSpokenLanguages: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    availableLanguages: AVAILABLE_LANGUAGES,
  };
}

/**
 * Fetches spoken language codes for a set of user IDs (for translation priority).
 */
export async function fetchAudienceLanguages(userIds: string[]): Promise<string[]> {
  if (!userIds.length) return ["en", "fr"];
  const { data } = await supabase
    .from("user_spoken_languages")
    .select("language_code")
    .in("user_id", userIds);
  const codes = new Set((data ?? []).map((r: any) => r.language_code));
  // Always include platform defaults
  codes.add("en");
  codes.add("fr");
  return Array.from(codes);
}
