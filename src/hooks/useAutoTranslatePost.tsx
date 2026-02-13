import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

/**
 * Automatically translates a post's content into the reader's UI language.
 * 1. First checks if a cached translation exists in DB.
 * 2. If not, triggers the translate-content edge function on mount.
 * 3. Returns translated text + toggle helpers.
 */
export function useAutoTranslatePost(postId: string, originalContent: string | null) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const qc = useQueryClient();
  const needsTranslation = !!originalContent && lang !== "en";

  // 1. Check for cached translation in DB
  const { data: cachedTranslation, isLoading: isCacheLoading } = useQuery({
    queryKey: ["post-translation", postId, lang],
    queryFn: async () => {
      const { data } = await supabase
        .from("content_translations")
        .select("translated_text")
        .eq("entity_type", "FEED_POST")
        .eq("entity_id", postId)
        .eq("field_name", "content")
        .eq("language_code", lang)
        .maybeSingle();
      return data?.translated_text ?? null;
    },
    enabled: needsTranslation,
    staleTime: 10 * 60_000, // 10 min cache
  });

  // 2. Auto-trigger translation if no cached version found
  const translateMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("translate-content", {
        body: {
          entityType: "FEED_POST",
          entityId: postId,
          fieldName: "content",
          text: originalContent,
          targetLanguage: lang,
        },
      });
      if (error) throw error;
      return data?.translatedText as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-translation", postId, lang] });
    },
  });

  // Auto-trigger once cache check is done and no cached translation exists
  const shouldAutoTranslate =
    needsTranslation &&
    !isCacheLoading &&
    cachedTranslation === null &&
    !translateMut.isPending &&
    !translateMut.isSuccess &&
    !translateMut.isError;

  // Use effect-like trigger via query
  // We use a separate query to avoid re-triggering
  useQuery({
    queryKey: ["post-auto-translate-trigger", postId, lang],
    queryFn: async () => {
      await translateMut.mutateAsync();
      return true;
    },
    enabled: shouldAutoTranslate,
    staleTime: Infinity,
    retry: false,
  });

  const translatedText = cachedTranslation ?? (translateMut.data || null);
  const isTranslating = isCacheLoading || translateMut.isPending;

  return {
    translatedText,
    isTranslating,
    isTranslated: !!translatedText,
    needsTranslation,
    /** Manually retry translation */
    retryTranslation: () => translateMut.mutate(),
  };
}
