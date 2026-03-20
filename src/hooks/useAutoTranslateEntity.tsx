import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Auto-triggers translation for multiple fields of an entity when the user's
 * language is not English and no cached translation exists yet.
 */
export function useAutoTranslateEntity(
  entityType: string,
  entityId: string | undefined,
  fields: { fieldName: string; originalText: string | null | undefined }[],
  translations: Record<string, { text: string | null; isTranslated: boolean }>,
) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const qc = useQueryClient();
  const triggered = useRef(new Set<string>());

  const translateMut = useMutation({
    mutationFn: async ({ fieldName, text }: { fieldName: string; text: string }) => {
      const { error } = await supabase.functions.invoke("translate-content", {
        body: { entityType, entityId, fieldName, text, targetLanguage: lang },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-translations-batch", entityType, entityId, lang] });
    },
  });

  useEffect(() => {
    if (lang === "en" || !entityId) return;

    for (const f of fields) {
      const key = `${entityId}:${f.fieldName}:${lang}`;
      if (!f.originalText) continue;
      if (translations[f.fieldName]?.isTranslated) continue;
      if (triggered.current.has(key)) continue;
      if (translateMut.isPending) continue;

      triggered.current.add(key);
      translateMut.mutate({ fieldName: f.fieldName, text: f.originalText });
      break; // one at a time
    }
  }, [lang, entityId, fields, translations, translateMut.isPending]);
}
