import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function WhatComesNextPage({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { persona } = usePersona();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const items = t("whatComesNextPage.items", { returnObjects: true }) as string[];

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await supabase.from("feature_suggestions").insert({
        user_id: user?.id ?? null,
        original_text: text.trim(),
        source: "OTHER",
        persona_at_time: persona !== "UNSET" ? persona.toLowerCase() : null,
        status: "NEW",
        user_explicit: true,
      } as any);
      toast.success(t("whatComesNextPage.successToast"));
      setText("");
    } catch {
      toast.error(t("whatComesNextPage.errorToast"));
    } finally {
      setSending(false);
    }
  };

  const content = (
    <div className={embedded ? "max-w-2xl mx-auto px-4" : "max-w-2xl mx-auto py-12 sm:py-20 px-4"}>
      <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
          {t("pages.whatComesNext.title")}
        </h1>
        <p className="text-muted-foreground text-lg mb-12">
          {t("pages.whatComesNext.subtitle")}
        </p>

        <div className="space-y-4 text-base sm:text-lg leading-relaxed text-foreground/90">
          <p>{t("whatComesNextPage.upcoming")}</p>

          <ul className="list-disc list-inside space-y-1 pl-1 pt-2">
            {Array.isArray(items) && items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>

          <div className="pt-10 space-y-2">
            <p>{t("whatComesNextPage.haveIdea")}</p>
            <p>
              {t("whatComesNextPage.tellUs")}<br />
              {t("whatComesNextPage.weListen")}
            </p>
          </div>
        </div>

        <div className="mt-12 space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("whatComesNextPage.placeholder")}
            className="min-h-[120px] border-border/40 bg-transparent resize-none text-base"
          />
          <Button
            onClick={handleSubmit}
            disabled={sending || !text.trim()}
            variant="outline"
            size="sm"
          >
            {sending ? t("whatComesNextPage.sending") : t("whatComesNextPage.sendButton")}
          </Button>
        </div>
      </div>
  );
  if (embedded) return content;
  return <PageShell>{content}</PageShell>;
}
